const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function runMainStage() {
    let options = new chrome.Options();
    options.addArguments("--profile-directory=Profile 1"); // Use a separate profile

    let driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
    try {
        await driver.manage().window().maximize();
        await driver.get('https://main.stage-smartflow.com/m_user_login/agency/2/sign_in');
        await driver.sleep(2000);
        console.log("🔵 Main Stage Browser Launched!");
        
        // Perform operations in the main stage...
        // Login
        console.log("🔑 Logging in...");
        await driver.wait(until.elementLocated(By.name('username')), 10000);
        let inputField = await driver.findElement(By.name('username'));
        await inputField.clear();
        await inputField.sendKeys('yamamoto_m@yopmail.com');

        await driver.wait(until.elementLocated(By.name('password')), 10000);
        let passwordField = await driver.findElement(By.name('password'));
        await passwordField.clear();
        await passwordField.sendKeys('d2Ak5CMT1DNC41!');

        await driver.findElement(By.className('submit')).click();
        await driver.wait(until.urlContains('dashboard'), 15000);
        console.log("✅ Login successful!");

        // Click on "All Items" link
        let retries = 3;
        while (retries > 0) {
            try {
                let element = await driver.wait(until.elementLocated(By.css('[href="#/app/dashboard/items/3/"]')), 10000);
                await driver.wait(until.elementIsVisible(element), 5000);
                await driver.executeScript('arguments[0].scrollIntoView(true);', element);
                await driver.sleep(1000);
                await driver.executeScript('arguments[0].click();', element);
                console.log("📌 Navigated to All Items");
                break;
            } catch (error) {
                if (retries === 1) throw error;
                console.warn(`Retrying to locate and click "All Items"... Attempts left: ${retries - 1}`);
                await driver.sleep(2000);
                retries--;
            }
        }

        await driver.sleep(2000);

        // Click on "Approved" tab
        retries = 3;
        while (retries > 0) {
            try {
                let elementApproved = await driver.wait(until.elementLocated(By.xpath('//a/span[text()="完了"]')), 10000);
                await driver.wait(until.elementIsVisible(elementApproved), 5000);
                await driver.executeScript('arguments[0].scrollIntoView(true);', elementApproved);
                await driver.sleep(1000);
                await driver.executeScript('arguments[0].click();', elementApproved);
                console.log("✅ Approved tab clicked successfully!");
                break;
            } catch (error) {
                if (retries === 1) throw error;
                console.warn(`Retrying to locate and click "Approved" tab... Attempts left: ${retries - 1}`);
                await driver.sleep(2000);
                retries--;
            }
        }

        await driver.sleep(2000);

        // Locate table
        retries = 3;
        while (retries > 0) {
            try {
                let table = await driver.wait(until.elementLocated(By.css('table.table')), 10000);
                await driver.wait(until.elementIsVisible(table), 5000);
                console.log("✅ Table is visible.");
                break;
            } catch (error) {
                if (retries === 1) throw error;
                console.warn(`Retrying to locate table... Attempts left: ${retries - 1}`);
                await driver.sleep(2000);
                retries--;
            }
        }

        // Application Numbers and Data Storage
        let applicationNumbers = ["0156"]; // Modify as needed
        let formData = [];

        // ✅ Process Applications & Extract Data
        await processApplicationsAndDownloadFiles(driver, applicationNumbers, formData);

        console.log("📦 Main_Stage Final extracted data:", applicationNumbers, formData);
        return formData;  // Ensure the form data is returned

    } catch (error) {
        console.error("❌ Error in Main Stage:", error);
    } finally {
        await driver.quit();
        console.log("🚪 Browser closed.");
    }
}

// ✅ Process Applications & Extract Data
async function processApplicationsAndDownloadFiles(driver, applicationNumbers, formData) {
    // Loop over each application number
    for (let appNumber of applicationNumbers) {
        console.log(`🔍 Searching for application: ${appNumber}`);

        // Perform search
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

        // Click the first search result and open it in a new tab
        let firstResult = await driver.wait(
            until.elementLocated(By.css("table.table tbody tr:first-child td:nth-child(4) div div.d-flex.align-items-center")),
            10000
        );

        await driver.actions().keyDown(Key.CONTROL).click(firstResult).keyUp(Key.CONTROL).perform();
        console.log(`✅ Clicked on the searched application: ${appNumber} (Opening in new tab)`);

        // Switch to new tab and process the application
        await driver.sleep(5000);
        let tabs = await driver.getAllWindowHandles();
        await driver.switchTo().window(tabs[tabs.length - 1]);
        console.log(`✅ Switched to new tab for application: ${appNumber}`);

        await driver.sleep(5000);

        // Wait for form to load
        await driver.wait(until.elementLocated(By.id("requestform")), 5000);
        console.log("✅ Form loaded successfully");

        // Extract form data
        let data = await extractFormData(driver);

        // Push extracted data to formData array
        formData.push(...data);

        // Close the current tab and return to the main tab
        await driver.close();
        await driver.switchTo().window(tabs[0]);
        console.log(`🔙 Switched back after processing ${appNumber}`);

        await driver.sleep(3000);
    }
}

// ✅ Extract form data
async function extractFormData(driver) {
    let valuesAndLabels = await driver.executeScript(() => {
        let result = [];
        const seen = new Set(); // To track unique label-value pairs
        const radioGroups = new Map(); // ✅ Defined inside script scope

        // Get all form elements in the correct order
        const formElements = document.querySelectorAll('input.form-control, textarea.form-control, select.form-control, input[type="checkbox"], input[type="radio"]');

        formElements.forEach(input => {
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

            let value = "No value";


           // ✅ Extract Checkbox Values
            if (input.type === "checkbox") {
                let groupLabelElement = input.closest('.col-md-12')?.querySelector('label.jd-label');
                let groupLabel = groupLabelElement ? groupLabelElement.innerText.trim() : "";

                if (groupLabel) { // ✅ Skip if no group label is found
                    value = input.checked ? "Checked" : "Unchecked";

                    if (!seen.has(groupLabel + value)) {
                        result.push({ label: groupLabel, value });
                        seen.add(groupLabel + value);
                    }
                }
            }

          // ✅ Extract Selected and Not Selected Radio Button Values
            else if (input.type === "radio") {
                let groupLabelElement = input.closest('.col-md-12')?.querySelector('label.jd-label');
                let groupLabel = groupLabelElement ? groupLabelElement.innerText.trim() : "";

                if (groupLabel) { // ✅ Skip if no group label is found
                    if (!radioGroups.has(input.name)) {
                        document.querySelectorAll(`input[name="${input.name}"]`).forEach(radio => {
                            let optionLabel = radio.parentElement?.textContent.trim() || radio.value.trim() || "No Option Label";
                            let value = radio.checked 
                                ? `Selected: ${optionLabel}` 
                                : `Not Selected: ${optionLabel}`;

                            if (!seen.has(groupLabel + value)) {
                                result.push({ label: groupLabel, value });
                                seen.add(groupLabel + value);
                            }
                        });

                        radioGroups.set(input.name, true);
                    }
                }
            }

            // ✅ Extract Text Inputs, Textareas, Selects
            else if (input.tagName === "SELECT") {
                value = input.options[input.selectedIndex]?.text.trim() || "No value";
            } else {
                value = input.value.trim() || "No value";
            }

            if (label === 'No label' || value === 'No value') return;
            if (seen.has(label + value)) return;

            result.push({ label, value });
            seen.add(label + value);
        });

         return result;
    });

//    console.log("📌 Extracted Data:", valuesAndLabels);
    return valuesAndLabels;
}

//===================Do Not Change Above===========================



//===================Production===========================
async function runProduction() {
    let options = new chrome.Options();
    options.addArguments("--profile-directory=Profile 2"); // Use another profile

    let driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
    let formData = []; // Declare formData at the beginning of the function to keep track of the data

    try {
        await driver.manage().window().maximize();
        await driver.get('https://auth.vebuin.com/auth/realms/smartflow/protocol/openid-connect/auth?client_id=smartflow_public&redirect_uri=https%3A%2F%2Fsmartflow.vebuin.com%2Fm_user_login%2Fagency%2F3%2Fsign_in%3Fclear&state=0e7ab06c-dff9-43b6-bca2-896515e8acfb&response_mode=fragment&response_type=code&scope=openid&nonce=c5c28dc7-7625-4d4d-a576-f697a8062765&code_challenge=9ZG9_CY4yDey09Q9icA4mkLEVcLq7SgZUQCyzynUUk8&code_challenge_method=S256');
        await driver.sleep(2000);
        console.log("🟢 Production Browser Launched!");
        
        // Perform login as usual...
        console.log("🔑 Logging in...");
        await driver.wait(until.elementLocated(By.name('username')), 10000);
        let inputField = await driver.findElement(By.name('username'));
        await inputField.clear();
        await inputField.sendKeys('chandni_pro_1@yopmail.com');

        await driver.wait(until.elementLocated(By.name('password')), 10000);
        let passwordField = await driver.findElement(By.name('password'));
        await passwordField.clear();
        await passwordField.sendKeys('123123123');

        await driver.findElement(By.className('submit')).click();
        await driver.wait(until.urlContains('dashboard'), 15000);
        console.log("✅ Login successful!");

        // Click on "All Items" link
        let retries = 3;
        while (retries > 0) {
            try {
                let element = await driver.wait(until.elementLocated(By.css('[href="#/app/dashboard/items/3/"]')), 10000);
                await driver.wait(until.elementIsVisible(element), 5000);
                await driver.executeScript('arguments[0].scrollIntoView(true);', element);
                await driver.sleep(1000);
                await driver.executeScript('arguments[0].click();', element);
                console.log("📌 Navigated to All Items");
                break;
            } catch (error) {
                if (retries === 1) throw error;
                console.warn(`Retrying to locate and click "All Items"... Attempts left: ${retries - 1}`);
                await driver.sleep(2000);
                retries--;
            }
        }

        await driver.sleep(2000);

        // Click on "Approved" tab
        retries = 3;
        while (retries > 0) {
            try {
                let elementApproved = await driver.wait(until.elementLocated(By.xpath('//a/span[text()="完了"]')), 10000);
                await driver.wait(until.elementIsVisible(elementApproved), 5000);
                await driver.executeScript('arguments[0].scrollIntoView(true);', elementApproved);
                await driver.sleep(1000);
                await driver.executeScript('arguments[0].click();', elementApproved);
                console.log("✅ Approved tab clicked successfully!");
                break;
            } catch (error) {
                if (retries === 1) throw error;
                console.warn(`Retrying to locate and click "Approved" tab... Attempts left: ${retries - 1}`);
                await driver.sleep(2000);
                retries--;
            }
        }

        await driver.sleep(2000);

        // Locate table
        retries = 3;
        while (retries > 0) {
            try {
                let table = await driver.wait(until.elementLocated(By.css('table.table')), 10000);
                await driver.wait(until.elementIsVisible(table), 5000);
                console.log("✅ Table is visible.");
                break;
            } catch (error) {
                if (retries === 1) throw error;
                console.warn(`Retrying to locate table... Attempts left: ${retries - 1}`);
                await driver.sleep(2000);
                retries--;
            }
        }

        // Application Numbers and Data Storage
        let applicationNumbers = ["0002"]; // Modify as needed
        let formData = []; // Ensure this is declared before it's used

          // ✅ Process Applications & Extract Data
        await processApplicationsAndDownloadFiles(driver, applicationNumbers, formData);

        console.log("📦 Production  Final extracted data:", applicationNumbers, formData);
        return formData;  // Ensure the form data is returned

        } catch (error) {
            console.error("❌ Error in Production:", error);
        } finally {
            await driver.quit();
            console.log("🚪 Browser closed.");
        }
    }
        // ✅ Process Applications & Extract Data
    //     await processApplicationsAndDownloadFiles(driver, applicationNumbers, formData); // Pass formData here

    //     console.log("📦 Production Final extracted data:", formData); // Log final extracted data here

    // } catch (error) {
    //     console.error("❌ An error occurred:", error);
    // } finally {
    //     if (driver) {
    //         await driver.quit();
    //         console.log("🚪 Browser closed.");
    //     }
    // }
//}

async function processApplicationsAndDownloadFiles(driver, applicationNumbers, formData) {
    for (let appNumber of applicationNumbers) {
        console.log(`🔍 Searching for application: ${appNumber}`);

        // Perform search
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

        // Click the first search result
        let firstResult = await driver.wait(
            until.elementLocated(By.css("table.table tbody tr:first-child td:nth-child(4) div div.d-flex.align-items-center")),
            10000
        );

        await driver.actions().keyDown(Key.CONTROL).click(firstResult).keyUp(Key.CONTROL).perform();
        console.log(`✅ Clicked on the searched application: ${appNumber} (Opening in new tab)`);

        // Switch to new tab
        await driver.sleep(5000);
        let tabs = await driver.getAllWindowHandles();
        await driver.switchTo().window(tabs[tabs.length - 1]);
        console.log(`✅ Switched to new tab for application: ${appNumber}`);

        // Wait for form to load
        await driver.wait(until.elementLocated(By.id("requestform")), 5000);
        console.log("✅ Form loaded successfully");

        // Extract form data and update formData array
        let extractedData = await extractFormData(driver);
        formData.push(...extractedData); // Merge the extracted data into formData array

        // Close the tab and switch back to main tab
        await driver.close();
        await driver.switchTo().window(tabs[0]);
        console.log(`🔙 Switched back after processing ${appNumber}`);

        await driver.sleep(3000);
    }
}

// ✅ Extract form data
async function extractFormData(driver) {
    let valuesAndLabels = await driver.executeScript(() => {
        let result = [];
        const seen = new Set(); // To track unique label-value pairs
        const radioGroups = new Map(); // ✅ Defined inside script scope

        // Get all form elements in the correct order
        const formElements = document.querySelectorAll('input.form-control, textarea.form-control, select.form-control, input[type="checkbox"], input[type="radio"]');

        formElements.forEach(input => {
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

            let value = "No value";


            // ✅ Extract Checkbox Values
            if (input.type === "checkbox") {
                let groupLabelElement = input.closest('.col-md-12')?.querySelector('label.jd-label');
                let groupLabel = groupLabelElement ? groupLabelElement.innerText.trim() : "";

                if (groupLabel) { // ✅ Skip if no group label is found
                    value = input.checked ? "Checked" : "Unchecked";

                    if (!seen.has(groupLabel + value)) {
                        result.push({ label: groupLabel, value });
                        seen.add(groupLabel + value);
                    }
                }
            }

          // ✅ Extract Selected and Not Selected Radio Button Values
            else if (input.type === "radio") {
                let groupLabelElement = input.closest('.col-md-12')?.querySelector('label.jd-label');
                let groupLabel = groupLabelElement ? groupLabelElement.innerText.trim() : "";

                if (groupLabel) { // ✅ Skip if no group label is found
                    if (!radioGroups.has(input.name)) {
                        document.querySelectorAll(`input[name="${input.name}"]`).forEach(radio => {
                            let optionLabel = radio.parentElement?.textContent.trim() || radio.value.trim() || "No Option Label";
                            let value = radio.checked 
                                ? `Selected: ${optionLabel}` 
                                : `Not Selected: ${optionLabel}`;

                            if (!seen.has(groupLabel + value)) {
                                result.push({ label: groupLabel, value });
                                seen.add(groupLabel + value);
                            }
                        });

                        radioGroups.set(input.name, true);
                    }
                }
            }

            // ✅ Extract Text Inputs, Textareas, Selects
            else if (input.tagName === "SELECT") {
                value = input.options[input.selectedIndex]?.text.trim() || "No value";
            } else {
                value = input.value.trim() || "No value";
            }

            if (label === 'No label' || value === 'No value') return;
            if (seen.has(label + value)) return;

            result.push({ label, value });
            seen.add(label + value);
        });

         return result;
    });

 //   console.log("📌 Extracted Data:", valuesAndLabels);
    return valuesAndLabels;
}


// Run Main Stage first, then Production
(async function runBoth() {
    // Declare variables to store the data
    let mainStageData = [];
    let productionData = [];

    try {
        // Run Main Stage first
        mainStageData = await runMainStage(); // Wait for Main Stage to finish and capture data
        if (!Array.isArray(mainStageData)) {
            console.error("⚠️ Main Stage data is not an array!");
            return;
        }

        // After Main Stage finishes, run Production
        productionData = await runProduction(); // Wait for Production to finish and capture data
        if (!Array.isArray(productionData)) {
            console.error("⚠️ Production data is not an array!");
            return;
        }

        // Compare data from Main Stage and Production
        let comparisonResults = compareData(mainStageData, productionData);

        // If comparison results are empty, log a warning
        if (comparisonResults.length === 0) {
            console.warn("⚠️ No comparison results found.");
        } else {
            // Display the comparison results
            console.table(comparisonResults);
        }
    } catch (error) {
        console.error("❌ Error while running the process:", error);
    }
})();

// ✅ Function to compare form data between Main Stage and Production
async function compareFormData(mainStageData, productionData, appNumber) {
    if (!Array.isArray(mainStageData) || !Array.isArray(productionData)) {
        console.error(`❌ Invalid data for comparison for application ${appNumber}.`);
        return []; // Return an empty array if data is invalid
    }

    let comparisonResults = [];
    const specificLabels = ['テキストデータを入力してください Text', '番号を入力してください Number', 'メールアドレスを入力してください Email'];

    // Loop through the labels and compare their values
    specificLabels.forEach(label => {
        let entry1 = mainStageData.find(d => d.label === label);
        let entry2 = productionData.find(d => d.label === label);

        // Corrected: Use "label" and "value" instead of the full entry object
        let label1 = entry1 ? entry1.label : "Not Found"; 
        let label2 = entry2 ? entry2.label : "Not Found"; 

        let labelMatch = label1 === label2 ? "✅ Matched" : "❌ Mismatch";

        let value1 = entry1 ? entry1.value : "Not Found";
        let value2 = entry2 ? entry2.value : "Not Found";

        let valueMatch = value1 === value2 ? "✅ Matched" : "❌ Mismatch";

        // Corrected: Added missing commas and used label/value correctly
        comparisonResults.push({
            "Main Stage - Label": label1,
            "Main Stage - Value": value1,
            "Production - Label": label2,
            "Production - Value": value2,
            "Label Match": labelMatch,
            "Value Match": valueMatch
        });
    });
    console.log(`\nCompare with [Main_Stage Final extracted data for application ${appNumber} = Production Final extracted data for application ${appNumber}]`);
    return comparisonResults;
}

