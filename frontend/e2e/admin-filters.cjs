async function selectAdminFilter(page, label, option) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}
module.exports = { selectAdminFilter };
