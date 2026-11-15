const colorButtons = document.querySelectorAll('.color-dot');
colorButtons.forEach((button) => {
  button.addEventListener('click', () => {
    button.classList.toggle('active');
  });
});

const chips = document.querySelectorAll('.chip');
chips.forEach((chip) => {
  chip.addEventListener('click', () => {
    chip.classList.toggle('selected');
  });
});

const replacements = document.querySelectorAll('.replacement-item');
replacements.forEach((item) => {
  item.addEventListener('click', () => {
    replacements.forEach((entry) => entry.classList.remove('selected'));
    item.classList.add('selected');
  });
});
