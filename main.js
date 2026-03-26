document.querySelectorAll('.card').forEach((button) => {
  button.addEventListener('click', () => {
    const path = button.getAttribute('data-path');
    if (path) {
      window.location.href = path;
    }
  });
});
