const Iyzipay = require('iyzipay');
const crypto = require('crypto');

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

// Plan kodlari
const PLANS = {
  basic: {
    code: '3f9a1ae8-5e8f-4b67-aa53-76c5b944b3e8',
    name: 'Baslangic',
    price: 1188,
  },
  starter: {
    code: '3f9a1ae8-5e8f-4b67-aa53-76c5b944b3e8',
    name: 'Baslangic',
    price: 1188,
  },
  pro: {
    code: '8f9611a7-0f86-470d-b697-08d13a73d16d',
    name: 'Pro',
    price: 1788,
  },
  growth: {
    code: '8f9611a7-0f86-470d-b697-08d13a73d16d',
    name: 'Pro',
    price: 1788,
  },
};

module.exports = async (req, res) => {
  const requestedPlan = (req.query.planId || req.query.plan || 'starter').toLowerCase();

  console.log('Subscribe request received', {
    host: req.headers.host,
    plan: requestedPlan,
    siteUrl: process.env.SITE_URL || `https://${req.headers.host}`,
    iyzicoUri: iyzicoConfig.uri,
    hasApiKey: Boolean(process.env.IYZICO_API_KEY),
    hasSecretKey: Boolean(process.env.IYZICO_SECRET_KEY),
  });

  // Plan parametresini al
  const planKey = requestedPlan;
  const plan = PLANS[planKey];

  if (!plan) {
    return res.status(400).send('Gecersiz plan');
  }

  // Site URL'i (production'da cha0sar.shop, dev'de localhost)
  const siteUrl = process.env.SITE_URL || `https://${req.headers.host}`;

  // Musteri bilgilerini query'den al (opsiyonel, form ile gonderilebilir)
  // Simdilik default test degerler koyalim, ileride form eklersin
  const name = req.query.name || 'Musteri';
  const surname = req.query.surname || 'Aday';
  const email = req.query.email || `guest-${Date.now()}@cha0sar.shop`;
  const gsm = req.query.gsm || '+905000000000';
  const identityNumber = req.query.identityNumber || '11111111111';
  const address = req.query.address || 'Istanbul';
  const city = req.query.city || 'Istanbul';

  const conversationId = crypto.randomUUID();

  const request = {
    locale: 'tr',
    conversationId,
    pricingPlanReferenceCode: plan.code,
    subscriptionInitialStatus: 'ACTIVE',
    callbackUrl: `${siteUrl}/api/callback`,
    customer: {
      name,
      surname,
      identityNumber,
      email,
      gsmNumber: gsm,
      billingAddress: {
        contactName: `${name} ${surname}`,
        city,
        country: 'Turkey',
        address,
        zipCode: '34000',
      },
      shippingAddress: {
        contactName: `${name} ${surname}`,
        city,
        country: 'Turkey',
        address,
        zipCode: '34000',
      },
    },
  };

  try {
    const result = await new Promise((resolve, reject) => {
      iyzipay.subscriptionCheckoutForm.initialize(request, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    console.log('Iyzico initialize result', {
      status: result.status,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      conversationId,
      planKey,
    });

    if (result.status === 'success' && result.payWithIyzicoPageUrl) {
      // Kullaniciyi Iyzico odeme sayfasina yonlendir
      return res.redirect(302, result.payWithIyzicoPageUrl);
    }

    return res
      .status(400)
      .send(
        `Odeme linki olusturulamadi: ${result.errorMessage || 'Bilinmeyen hata'} (code: ${result.errorCode || 'n/a'}, envApiKey: ${process.env.IYZICO_API_KEY ? 'set' : 'fallback'}, envSecret: ${process.env.IYZICO_SECRET_KEY ? 'set' : 'fallback'}, uri: ${iyzicoConfig.uri})`
      );
  } catch (error) {
    console.error('Iyzico error:', {
      message: error.message,
      stack: error.stack,
      planKey,
      uri: iyzicoConfig.uri,
      hasApiKey: Boolean(process.env.IYZICO_API_KEY),
      hasSecretKey: Boolean(process.env.IYZICO_SECRET_KEY),
    });

    return res.status(500).send(
      `Sunucu hatasi, lutfen tekrar deneyin. (uri: ${iyzicoConfig.uri}, envApiKey: ${process.env.IYZICO_API_KEY ? 'set' : 'fallback'}, envSecret: ${process.env.IYZICO_SECRET_KEY ? 'set' : 'fallback'})`
    );
  }
};
