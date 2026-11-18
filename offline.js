/* MU MISTRY – offline page retry button (kept in a file because the CSP blocks inline scripts). */
document.getElementById('retry').addEventListener('click', function () { location.href = './'; });
window.addEventListener('online', function () { location.href = './'; });
