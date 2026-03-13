// Get API Base URL dynamically
const getApiBaseUrl = function () {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5115/api/log-client-error';
  }
  return window.location.origin + '/api/log-client-error';
};

window.addEventListener('error', function (event) {
  fetch(getApiBaseUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error ? event.error.stack : null
    })
  }).catch(function (e) { console.error('Error logger failed', e); });
});

window.addEventListener('unhandledrejection', function (event) {
  fetch(getApiBaseUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: event.reason ? event.reason.message : 'Unhandled Rejection',
      error: event.reason ? event.reason.stack : null
    })
  }).catch(function (e) { console.error('Error logger failed', e); });
});
