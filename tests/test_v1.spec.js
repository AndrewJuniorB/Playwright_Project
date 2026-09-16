import { test, expect } from '@playwright/test';

test('Natural reader home page login', async function({page}) {
  await page.goto('https://www.naturalreaders.com/online/');

  // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Free Text to Speech with Gemini and ChatGPT AI Voices/);

})
