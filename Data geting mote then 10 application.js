import { Builder, By, until, Key } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome.js'; // ✅ Corrected import

async function runTest() {
    let driver = await new Builder().forBrowser('chrome').setChromeOptions(new chrome.Options()).build();

    try {
        await driver.manage().window().maximize();
        await driver.get('https://main.stage-smartflow.com/m_user_login/agency/2/sign_in');
        await driver.sleep(2000);

        // ✅ Login
        let inputField = await driver.findElement(By.name('username'));
        await inputField.clear();
        await inputField.sendKeys('thinkbiz001+01@gmail.com');
        await driver.sleep(1000);

        let passwordField = await driver.findElement(By.name('password'));
        await passwordField.clear();
        await passwordField.sendKeys('123123123');
        await driver.sleep(1000);

        await driver.findElement(By.className('submit')).click();
        await driver.wait(until.urlContains('dashboard'), 15000);
        console.log('✅ Login successful!');

        await driver.sleep(2000);

        // ✅ Navigate to "All Items"
        let element = await driver.wait(until.elementLocated(By.css('[href="#/app/dashboard/items/3/"]')), 10000);
        await driver.executeScript('arguments[0].click();', element);
        console.log('✅ Navigated to All Items');

        await driver.sleep(2000);

        // ✅ Click the "Approved" tab
        let elementApproved = await driver.wait(until.elementLocated(By.xpath('//a/span[text()="Approved"]')), 10000);
        await driver.executeScript('arguments[0].click();', elementApproved);
        console.log('✅ Approved tab clicked');

        await driver.sleep(3000);

        // ✅ Search and open multiple applications
        let applicationNumbers = ["99999991000084", "99999991000090", ];

        for (let appNumber of applicationNumbers) {
            console.log(`🔍 Searching for application: ${appNumber}`);

            let searchBox = await driver.findElement(By.css("div.sf-panel-heading.ng-scope input[ng-model='query']"));
            await searchBox.clear();
            await searchBox.sendKeys(appNumber);
            await driver.sleep(5000);

            let results = await driver.wait(
                until.elementsLocated(By.css("table.table tbody tr")),
                10000
            );

            if (results.length === 0) {
                console.log(`❌ No search results found for ${appNumber}!`);
                continue;
            }

            // ✅ Click the first search result dynamically
            let firstResult = await driver.wait(
                until.elementLocated(By.css("table.table tbody tr:first-child td:nth-child(4) div div.d-flex.align-items-center")),
                10000
            );

            // ✅ Open in new tab using Ctrl + Click
            await driver.actions().keyDown(Key.CONTROL).click(firstResult).keyUp(Key.CONTROL).perform();
            console.log(`✅ Clicked on the searched application: ${appNumber} (Opening in new tab)`);

            // ✅ Wait for the new tab to open and switch to it
            await driver.sleep(5000);
            let tabs = await driver.getAllWindowHandles();
            await driver.switchTo().window(tabs[tabs.length - 1]);
            console.log(`✅ Switched to new tab for application: ${appNumber}`);

            await driver.sleep(5000);

            // ✅ Ensure the form is loaded
            await driver.wait(until.elementLocated(By.id("requestform")), 5000);
            console.log("✅ Form loaded successfully");

            // ✅ Data fetching logic (Preserved)
            let targetDiv = await driver.wait(
                until.elementLocated(By.css('.jd-panel')),
                5000
            );
            console.log('✅ Target Div Located!');

            await driver.wait(until.elementIsVisible(targetDiv), 5000);
            await driver.sleep(2000);

            await driver.wait(async () => {
                return await driver.executeScript("return document.readyState === 'complete';");
            }, 5000);

            // ✅ Extract form data before closing the tab
            await extractFormData(driver);

            // ✅ Close the current tab and switch back
            await driver.close();
            await driver.switchTo().window(tabs[0]);
            console.log(`🔙 Switched back after processing ${appNumber}`);

            await driver.sleep(3000);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await driver.quit();
        console.log('✅ Test Completed');
    }
}

// // ✅ Textbox value getting (Extracting Form Data)
// async function extractFormData(driver) {
//     let valuesAndLabels = await driver.executeScript(() => {
//         let result = [];
//         const seen = new Set(); // To track unique label-value pairs
        
//         const inputElements = document.querySelectorAll('input.form-control, textarea.form-control, select.form-control');
        
//         inputElements.forEach(input => {
//             let label = 'No label';
//             const labelFor = document.querySelector(`label[for="${input.id}"]`);
//             if (labelFor) {
//                 label = labelFor.textContent.trim();
//             } else {
//                 const closestLabel = input.closest('label');
//                 if (closestLabel) {
//                     label = closestLabel.textContent.trim();
//                 } else {
//                     const previousSibling = input.previousElementSibling;
//                     if (previousSibling && previousSibling.tagName === 'LABEL') {
//                         label = previousSibling.textContent.trim();
//                     }
//                 }
//             }

//             if (label === 'No label') {
//                 const placeholder = input.getAttribute('placeholder');
//                 if (placeholder) {
//                     label = placeholder.trim();
//                 }
//             }

//             const value = input.value.trim() || 'No value';
//             if (label === 'No label' || value === 'No value') return;
//             if (seen.has(label + value)) return; 

//             result.push({ label, value });
//             seen.add(label + value);
//         });
        
//         return result;
//     });

//     console.log("📌 Extracted Data:", valuesAndLabels);
// }


// ✅ Textbox value getting (Extracting Form Data)
async function extractFormData(driver) {
    let valuesAndLabels = await driver.executeScript(() => {
        let result = [];
        const seen = new Set(); // To track unique label-value pairs

        // Get all input elements (textboxes, textareas, selects)
        const inputElements = document.querySelectorAll('input.form-control, textarea.form-control, select.form-control');
        
        inputElements.forEach(input => {
            let label = 'No label';
            const labelFor = document.querySelector(`label[for="${input.id}"]`);
            if (labelFor) {
                label = labelFor.textContent.trim();
            } else {
                const closestLabel = input.closest('label');
                if (closestLabel) {
                    label = closestLabel.textContent.trim();
                } else {
                    const previousSibling = input.previousElementSibling;
                    if (previousSibling && previousSibling.tagName === 'LABEL') {
                        label = previousSibling.textContent.trim();
                    }
                }
            }

            if (label === 'No label') {
                const placeholder = input.getAttribute('placeholder');
                if (placeholder) {
                    label = placeholder.trim();
                }
            }

            const value = input.value.trim() || 'No value';
            if (label === 'No label' || value === 'No value') return;
            if (seen.has(label + value)) return;

            result.push({ label, value });
            seen.add(label + value);
        });

        // Get all radio buttons and their selected status with correct label
        const radioButtons = document.querySelectorAll('input[type="radio"]');
        radioButtons.forEach(radio => {
            let radioLabel = 'No label';
            const labelFor = document.querySelector(`label[for="${radio.id}"]`);
            if (labelFor) {
                radioLabel = labelFor.textContent.trim();
            } else {
                const closestLabel = radio.closest('label');
                if (closestLabel) {
                    radioLabel = closestLabel.textContent.trim();
                }
            }

            // Fallback logic to ensure meaningful label or value
            result.push({
                label: radioLabel || radio.name || `Radio ${radio.value}`, // Default label if not found
                value: radio.value,
                selected: radio.checked
            });
        });

        // Get all checkboxes and their selected status with correct label
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            let checkboxLabel = 'No label';
            const labelFor = document.querySelector(`label[for="${checkbox.id}"]`);
            if (labelFor) {
                checkboxLabel = labelFor.textContent.trim();
            } else {
                const closestLabel = checkbox.closest('label');
                if (closestLabel) {
                    checkboxLabel = closestLabel.textContent.trim();
                }
            }

            // Fallback logic to ensure meaningful label or value
            result.push({
                label: checkboxLabel || checkbox.name || `Checkbox ${checkbox.value}`, // Default label if not found
                value: checkbox.value,
                selected: checkbox.checked
            });
        });

        // Remove null or undefined values from the result
        return result.filter(item => item !== null && item !== undefined);
    });

    console.log("📌 Extracted Data:", valuesAndLabels);
}




// ✅ Run the test
runTest();
