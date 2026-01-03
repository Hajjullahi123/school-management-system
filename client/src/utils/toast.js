export const toast = {
  success: (message) => alert(`SUCCESS: ${message}`),
  error: (message) => alert(`ERROR: ${message}`),
  loading: (message) => console.log(`LOADING: ${message}`),
  info: (message) => alert(`INFO: ${message}`),
  dismiss: () => { },
};
