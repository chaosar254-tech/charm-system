const Iyzipay = require('iyzipay');
const { URLSearchParams } = require('url');

const iyzicoConfig = {
  apiKey: process.env.IYZICO_API_KEY || 'VKqh5cTmnc5rsZbtieA8CJtM4mYPuFcf',
  secretKey: process.env.IYZICO_SECRET_KEY || '4M9ztXmWFwpCEGBJVPg7tNmfeLwRZfsQ',
  uri: process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com',
};

const iyzipay = new Iyzipay({
  apiKey: iyzicoConfig.apiKey,
  secretKey: iyzicoConfig.secretKey,
  uri: iyzicoConfig.uri,
});

function getSiteUrl(req) {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  return process.env.SITE_URL || `${protocol}://${req.headers.host}`;
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk;
    });

    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

async function getParams(req) {
  const query = req.query || {};

  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return { ...req.body, ...query };
  }

  const rawBody = await readRawBody(req);
  if (!rawBody) return query;

  try {
    return { ...JSON.parse(rawBody), ...query };
  } catch (jsonError) {
    return { ...Object.fromEntries(new URLSearchParams(rawBody)), ...query };
  }
}

function retrieveCheckoutForm(checkoutFormToken) {
  return new Promise((resolve, reject) => {
    iyzipay.subscriptionCheckoutForm.retrieve({ checkoutFormToken }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

function isSuccessful(result, params) {
  const explicitFailureValues = ['failure', 'failed', 'error', 'cancel', 'cancelled'];
  const candidateValues = [
    params.status,
    params.paymentStatus,
    params.subscriptionStatus,
    params.result,
    result && result.status,
    result && result.data && result.data.status,
    result && result.data && result.data.subscriptionStatus,
    result && result.data && result.data.paymentStatus,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  if (candidateValues.some((value) => explicitFailureValues.includes(value))) {
    return false;
  }

  if (candidateValues.includes('success') || candidateValues.includes('active')) {
    return true;
  }

  return Boolean(params.token || params.checkoutFormToken);
}

module.exports = async (req, res) => {
  const siteUrl = getSiteUrl(req);

  try {
    const params = await getParams(req);
    const checkoutFormToken = params.token || params.checkoutFormToken;
    let result = null;

    if (checkoutFormToken) {
      result = await retrieveCheckoutForm(checkoutFormToken);
    }

    const targetPath = isSuccessful(result, params) ? '/success' : '/failed';
    return res.redirect(302, `${siteUrl}${targetPath}`);
  } catch (error) {
    console.error('Iyzico callback error:', {
      message: error.message,
      stack: error.stack,
    });

    return res.redirect(302, `${siteUrl}/failed`);
  }
};
