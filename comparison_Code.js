const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const xlsx = require('xlsx');

(async function runTest() {
    let driver = await new Builder().forBrowser('chrome').setChromeOptions(new chrome.Options()).build();

    try {
        // ✅  Step 1: Open & Login to Main Stage
        await driver.manage().window().maximize();
        console.log("🚀 Opening Main Stage website...");
        await driver.get("https://main.stage-smartflow.com/m_user_login/agency/2/sign_in");
        await loginToMainStage(driver);
        await navigateToRecord(driver); // ✅ Navigate to the form
        let mainStageData = await extractFormData(driver, "Main Stage");

        // ✅ Step 2: Open a New Tab for Production
        console.log("🚀 Opening Production website in a new tab...");
        await driver.executeScript("window.open('about:blank', '_blank');");
        let tabs = await driver.getAllWindowHandles();
        await driver.switchTo().window(tabs[1]); // Switch to new tab

        // ✅ Step 3: Open & Login to Production
        await driver.get("https://auth.vebuin.com/auth/realms/smartflow/protocol/openid-connect/auth?client_id=smartflow_public&redirect_uri=https%3A%2F%2Fsmartflow.vebuin.com%2Fm_user_login%2Fagency%2F3%2Fsign_in%3Fclear");
        await loginToProduction(driver);
        await navigateToRecord(driver); // ✅ Navigate to the form
        let productionData = await extractFormData(driver, "Production");

        // ✅ Step 4: Compare Data from Both Websites
        let comparisonResults = compareData(mainStageData, productionData);

        // ✅ Step 5: Export Data to Excel
        exportToExcel(mainStageData, productionData, comparisonResults);
        console.log("✅ Comparison results saved to Excel!");

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await driver.quit();
    }
})();

// ✅ Function to Login to Main Stage
async function loginToMainStage(driver) {
    console.log("🔑 Logging into Main Stage...");
    await driver.wait(until.elementLocated(By.name('username')), 10000);
    let usernameField = await driver.findElement(By.name('username'));
    await usernameField.clear();
    await usernameField.sendKeys('thinkbiz001+01@gmail.com');

    let passwordField = await driver.findElement(By.name('password'));
    await passwordField.clear();
    await passwordField.sendKeys('123123123');

    await driver.findElement(By.className('submit')).click();
    await driver.wait(until.urlContains('dashboard'), 10000);
    console.log("✅ Logged in to Main Stage!");
}

// ✅ Function to Login to Production
async function loginToProduction(driver) {
    console.log("🔑 Logging into Production...");
    await driver.wait(until.elementLocated(By.id('username')), 10000);
    let usernameField = await driver.findElement(By.id('username'));
    await usernameField.clear();
    await usernameField.sendKeys('chandni_pro_1@yopmail.com');

    let passwordField = await driver.findElement(By.id('password'));
    await passwordField.clear();
    await passwordField.sendKeys('123123123');

    // ✅ Updated Login Button Selector
    let loginButton = await driver.wait(until.elementLocated(By.className("submit")), 10000);
    await driver.executeScript("arguments[0].click();", loginButton);
    await driver.sleep(5000);
    console.log("✅ Logged in to Production!");
}

// ✅ Function to Navigate to the Form (Both Websites)
async function navigateToRecord(driver) {
    console.log("📌 Navigating to All Items...");

    let element = await driver.wait(until.elementLocated(By.css('[href="#/app/dashboard/items/3/"]')), 10000);
    await driver.wait(until.elementIsVisible(element), 5000);
    await driver.executeScript('arguments[0].scrollIntoView(true);', element);
    await driver.sleep(1000);

    if (await element.isEnabled()) {
        await driver.executeScript('arguments[0].click();', element);
        console.log('✅ Navigated to All Items');
    } else {
        console.warn('❌ Element is not clickable.');
    }
    await driver.sleep(2000);

    // ✅ Locate Table & Click First Record
    await driver.wait(until.elementLocated(By.css('table.table')), 30000);
    await driver.wait(until.elementIsVisible(await driver.findElement(By.css('table.table'))), 30000);
    console.log('✅ Table is visible');

    let anchor = await findElementWithRetry(driver, "//table/tbody/tr/td/a");
    await driver.executeScript('arguments[0].scrollIntoView(true);', anchor);
    await driver.sleep(1000);

    if (await anchor.isEnabled()) {
        await driver.executeScript('arguments[0].click();', anchor);
        console.log('✅ Clicked the first record in the table');
    } else {
        console.warn('❌ Anchor tag is not clickable.');
    }
    await driver.sleep(3000);

    let targetDiv = await driver.wait(until.elementLocated(By.css('.jd-panel')), 10000);
    console.log('✅ Target Div Located!');
    await driver.wait(until.elementIsVisible(targetDiv), 5000);
    await driver.sleep(20000);
}

// ✅ Function to Find an Element with Retry
async function findElementWithRetry(driver, xpath, maxRetries = 3) {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            return await driver.wait(until.elementLocated(By.xpath(xpath)), 15000);
        } catch (error) {
            console.warn(`❌ Attempt ${retries + 1} failed, retrying...`);
            retries++;
            await driver.sleep(3000);
        }
    }
    throw new Error(`❌ Failed to find element after ${maxRetries} attempts.`);
}

// ✅ Function to Extract Form Data (Updated with Your Main Logic)
async function extractFormData(driver, source) {
    let extractedData = [];
    
    // Wait until the target div is visible
    let targetDiv = await driver.wait(until.elementLocated(By.css('.jd-panel')), 10000);
    await driver.wait(until.elementIsVisible(targetDiv), 10000);
    await driver.sleep(2000);

    // Wait until the document is ready
    await driver.wait(async () => {
        return await driver.executeScript("return document.readyState === 'complete';");
    }, 10000);


// Textbox value getting
let valuesAndLabels = await driver.executeScript(`
  return Array.from(document.querySelectorAll('input.form-control')).map(input => {
    // Try to find a label associated with the input
    let label = 'No label';

    // Check for the closest label if it exists
    const closestLabel = input.closest('label');
    if (closestLabel) {
      label = closestLabel.textContent.trim();
    } else {
      // Try to find the previous sibling label if it's close to the input
      const previousLabel = input.previousElementSibling;
      if (previousLabel && previousLabel.tagName === 'LABEL') {
        label = previousLabel.textContent.trim();
      } else {
        // Check for a label using the 'for' attribute if available
        const labelFor = document.querySelector('label[for="' + input.id + '"]');
        if (labelFor) {
          label = labelFor.textContent.trim();
        }
      }
    }

    // If no label is found, fallback to placeholder or a default label
    if (label === 'No label') {
      const placeholder = input.getAttribute('placeholder');
      if (placeholder) {
        label = placeholder.trim();
      }
    }

    // Return the label and the value of the input field
    return { label: label || 'No label', value: input.value.trim() || 'No value' };
  }) || [{ label: 'No label', value: 'N/A' }];
`);

console.log("📌 Textbox Values and Labels:", valuesAndLabels);

//console.log("📌 Textbox Values and Labels:", valuesAndLabels);



    // Extract values and corresponding labels from textareas
    let valuesWithLabels = await driver.executeScript(`
        let inputs = [];
        let formElements = document.querySelectorAll('input[type="text"], textarea');
        
        formElements.forEach(function(element) {
            // Initialize default label as 'No Label'
            let label = 'No Label';
            
            // Try to get the label based on the 'for' attribute
            const id = element.id;
            if (id) {
                const labelFor = document.querySelector('label[for="' + id + '"]');
                if (labelFor) {
                    label = labelFor.innerText.trim();
                }
            }

            // If no label via 'for', find the closest label in the same container
            if (label === 'No Label') {
                const closestLabel = element.closest('div').querySelector('label');
                if (closestLabel) {
                    label = closestLabel.innerText.trim();
                }
            }

            // Capture the value or set to 'N/A' if empty
            let value = element.value.trim() || 'N/A';

            // Only push to the array if the value is not 'N/A' and label is valid
            if (value !== 'N/A' && label !== 'No Label') {
                inputs.push({ label: label, value: value });
            }
        });

        // Filter out duplicates by checking for the same label
        const uniqueInputs = [];
        inputs.forEach(item => {
            if (!uniqueInputs.some(existingItem => existingItem.label === item.label && existingItem.value === item.value)) {
                uniqueInputs.push(item);
            }
        });

        return uniqueInputs;
    `);

//    console.log("📌 Filtered Textbox and Textarea Values with Labels:", valuesWithLabels);

    // Extract all labels and associated values
    let labels = await driver.findElements(By.css('label'));

    for (let label of labels) {
        let labelText = await label.getText();

        // Skip labels containing 'content_copy' or empty labels
        if (labelText.includes('content_copy') || labelText.trim() === '') continue;

        let associatedElement;
        let value = "N/A";
        try {
            // Try to find the associated form element after the label
            associatedElement = await label.findElement(By.xpath("following-sibling::input | following-sibling::select | following-sibling::textarea"));
        } catch (e) {
            associatedElement = null;
        }

        // If associated element is found, extract its value based on the tag name and type
        if (associatedElement) {
            let tagName = await associatedElement.getTagName();
            let type = await associatedElement.getAttribute("type");

            await driver.sleep(2000);
            if (tagName === "input") {
                value = type === "checkbox" || type === "radio" ? 
                        (await associatedElement.getAttribute("checked") ? await associatedElement.getAttribute("value") : "N/A") : 
                        await associatedElement.getAttribute("value") || "N/A";
            } else if (tagName === "select") {
                let selectedOption = await associatedElement.findElement(By.css("option:checked"));
                value = await selectedOption.getText() || "N/A";
            } else if (tagName === "textarea") {
                value = await associatedElement.getAttribute("value") || "N/A";
            }
        }

        // If value is not 'N/A' and not empty, add to the extracted data
        if (value !== "N/A" && value.trim() !== "") {
            extractedData.push({ label: labelText, value: value });
        }
    }

    // Combine the data from both textboxes/textareas and labels extraction
    let combinedData = [...valuesWithLabels, ...extractedData];

    // Remove duplicates based on label-value pairs
    let uniqueData = [];
    combinedData.forEach(item => {
        if (!uniqueData.some(existingItem => existingItem.label === item.label && existingItem.value === item.value)) {
            uniqueData.push(item);
        }
    });

    console.log("📌 Combined Extracted Data (Filtered):", uniqueData);

    return uniqueData;
}

// ✅ Function to Compare Data from Both Websites
function compareData(data1, data2) {
    let comparisonResults = [];
    let allLabels = new Set([...data1.map(d => d.label), ...data2.map(d => d.label)]);

    allLabels.forEach(label => {
        let entry1 = data1.find(d => d.label === label);
        let entry2 = data2.find(d => d.label === label);

        let value1 = entry1 ? entry1.value : "Not Found";
        let value2 = entry2 ? entry2.value : "Not Found";

        let labelMatch = entry1 && entry2 ? "✅ Matched" : "❌ Mismatch";
        let valueMatch = value1 === value2 ? "✅ Matched" : "❌ Mismatch";

        comparisonResults.push({
            "Main Stage - Label": entry1 ? entry1.label : "Not Found",
            "Main Stage - Value": value1,
            "Production - Label": entry2 ? entry2.label : "Not Found",
            "Production - Value": value2,
            "Label Match": labelMatch,
            "Value Match": valueMatch
        });
    });

    // ✅ Define Bold Headers for Comparison Sheet
    const headerRow = [
        "Main Stage - Label",
        "Main Stage - Value",
        "Production - Label",
        "Production - Value",
        "Label Match",
        "Value Match"
    ];

    // ✅ Add Bold Styling to Header Row
    const ws3Header = xlsx.utils.aoa_to_sheet([headerRow]);
    Object.keys(ws3Header).forEach(cell => {
        if (cell.startsWith('A') || cell.startsWith('B') || cell.startsWith('C') || cell.startsWith('D') || cell.startsWith('E') || cell.startsWith('F')) {
            ws3Header[cell].s = { font: { bold: true } };
        }
    });

    // ✅  Print Comparison Results to Console
    console.table(comparisonResults);

    return comparisonResults;
}

// ✅ Function to Export Data to Excel
function exportToExcel(mainStageData, productionData, comparisonResults) {
    const wb = xlsx.utils.book_new();

    // Convert JSON data to worksheets
    const ws1 = xlsx.utils.json_to_sheet(mainStageData);
    const ws2 = xlsx.utils.json_to_sheet(productionData);
    const ws3 = xlsx.utils.json_to_sheet(comparisonResults);

    // Append worksheets to the workbook
    xlsx.utils.book_append_sheet(wb, ws1, 'Main Stage');
    xlsx.utils.book_append_sheet(wb, ws2, 'Production');
    xlsx.utils.book_append_sheet(wb, ws3, 'Comparison Results');

    // Save Excel file
    let filePath = 'comparison_results_1.xlsx';
    xlsx.writeFile(wb, filePath);
    console.log(`📂 Excel file saved: ${filePath}`);
}
