window.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('a.toggle').forEach(function (toggle) {
    var titleLink = toggle.previousElementSibling;
    if (titleLink && titleLink.tagName === 'A') {
      titleLink.addEventListener('click', function () {
        toggle.click();
      });
    }
  });
});
