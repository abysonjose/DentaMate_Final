export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  wsUrl: 'ws://localhost:3000',
  appName: 'DentaMate',
  version: '1.0.0',
  features: {
    aiDiagnosis: true,
    prescriptionOcr: true,
    realTimeQueue: true,
    multiTenant: true
  },
  integrations: {
    razorpay: {
      keyId: 'rzp_test_S2YTqsoCrVzqgn'
    },
    google: {
      clientId: '393568475030-e61rnnshg38vm17fbikogoov0fr4dfmk.apps.googleusercontent.com'
    }
  }
};