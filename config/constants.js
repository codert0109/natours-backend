const clientUrl =
  process.env.NODE_ENV === 'production'
    ? 'https://arunbohra-natours.netlify.app'
    : 'http://127.0.0.1:5173';

exports.CLIENT_BASE_URL = clientUrl;
