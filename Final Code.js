const { Builder, By, until, Key } = require('selenium-webdriver');
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
    
    // ✅ Click the "Approved" tab
    let elementApproved = await driver.wait(until.elementLocated(By.xpath('//a/span[text()="Approved"]')), 10000);
    await driver.executeScript('arguments[0].click();', elementApproved);
    console.log('✅ Approved tab clicked');

    await driver.sleep(3000);



    // ✅ Search and open multiple applications
    let applicationNumbers = ["0001", "0002"];

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

}

// ✅ Textbox value getting (Extracting Form Data)
async function extractFormData(driver) {
    let valuesAndLabels = await driver.executeScript(() => {
        let result = [];
        const seen = new Set(); // To track unique label-value pairs

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

        return result;
    });

    console.log("📌 Extracted Data:", valuesAndLabels);
}
//============================Do not Change Above anything==============================

async function extractAdditionalFormData(driver) {
    let targetDiv1 = await driver.wait(
        until.elementLocated(By.css('.jd-panel')), // Ensure correct container
        10000
    );
    console.log('✅ Target Div Located!');

    await driver.wait(until.elementIsVisible(targetDiv1), 5000);

    let labels1 = await driver.wait(
        until.elementsLocated(By.css('.jd-panel .panel-body label')),
        5000
    );

    let labelsAndValues2 = []; // Initialize array to store label-value pairs

    for (let i = 0; i < labels1.length; i++) {
        try {
            let freshLabels1 = await driver.findElements(By.css('.jd-panel .panel-body label'));
            let label = freshLabels1[i];

            let labelText = await label.getText();
            let valueText = "N/A";

            try {
                let valueElement = await driver.executeScript(
                    "return arguments[0].nextElementSibling || arguments[0].parentElement.querySelector('input, div, span');",
                    label
                );

                if (valueElement) {
                    valueText = await valueElement.getAttribute('value') || await valueElement.getText();
                }
            } catch (err) {
                console.warn(`⚠️ Error finding value for label: "${labelText}" - ${err.message}`);
            }

            console.log(`📌 Label: "${labelText}" => Value: "${valueText}"`);
            labelsAndValues2.push({ label: labelText, value: valueText });

        } catch (error) {
            console.warn(`⚠️ Skipping stale label: ${error.message}`);
        }
    }

    return labelsAndValues2;
}
        
        // const xlsx = require('xlsx');
        // const fs = require('fs');

        // // Function to compare label-value pairs and include all values
        // function generateComparisonData(labelsAndValues1, labelsAndValues2) {
        //     let comparisonData = [];

        //     // Create a set of all unique labels from both websites
        //     let allLabels = new Set([
        //         ...labelsAndValues1.map(item => item.label),
        //         ...labelsAndValues2.map(item => item.label)
        //     ]);

        //     allLabels.forEach(label => {
        //         let website1Entry = labelsAndValues1.find(item => item.label === label);
        //         let website2Entry = labelsAndValues2.find(item => item.label === label);

        //         let value1 = website1Entry ? website1Entry.value : "Not Found";
        //         let value2 = website2Entry ? website2Entry.value : "Not Found";

        //         let status = (value1 === value2) ? "✅ Match" : "❌ Mismatch";

        //         comparisonData.push({ Label: label, "Website 1 Value": value1, "Website 2 Value": value2, Status: status });
        //     });

        //     return comparisonData;
        // }

        // // Generate comparison data
        // let comparisonResults = generateComparisonData(labelsAndValues1, labelsAndValues2);

        // // Create an Excel workbook
        // let workbook = xlsx.utils.book_new();

        // // Convert JSON to worksheet
        // let worksheet = xlsx.utils.json_to_sheet(comparisonResults);

        // // Append worksheet to workbook
        // xlsx.utils.book_append_sheet(workbook, worksheet, "Comparison Results");

        // // Save the Excel file
        // let filePath = "comparison_results.xlsx";
        // xlsx.writeFile(workbook, filePath);

        // console.log(`📂 Excel file saved: ${filePath}`);








// // ✅ Function to Compare Data from Both Websites
// function compareData(data1, data2) {
//     let comparisonResults = [];
//     let allLabels = new Set([...data1.map(d => d.label), ...data2.map(d => d.label)]);

//     allLabels.forEach(label => {
//         let entry1 = data1.find(d => d.label === label);
//         let entry2 = data2.find(d => d.label === label);

//         let value1 = entry1 ? entry1.value : "Not Found";
//         let value2 = entry2 ? entry2.value : "Not Found";

//         let labelMatch = entry1 && entry2 ? "✅ Matched" : "❌ Mismatch";
//         let valueMatch = value1 === value2 ? "✅ Matched" : "❌ Mismatch";

//         comparisonResults.push({
//             "Main Stage - Label": entry1 ? entry1.label : "Not Found",
//             "Main Stage - Value": value1,
//             "Production - Label": entry2 ? entry2.label : "Not Found",
//             "Production - Value": value2,
//             "Label Match": labelMatch,
//             "Value Match": valueMatch
//         });
//     });

//     // ✅ Define Bold Headers for Comparison Sheet
//     const headerRow = [
//         "Main Stage - Label",
//         "Main Stage - Value",
//         "Production - Label",
//         "Production - Value",
//         "Label Match",
//         "Value Match"
//     ];

//     // ✅ Add Bold Styling to Header Row
//     const ws3Header = xlsx.utils.aoa_to_sheet([headerRow]);
//     Object.keys(ws3Header).forEach(cell => {
//         if (cell.startsWith('A') || cell.startsWith('B') || cell.startsWith('C') || cell.startsWith('D') || cell.startsWith('E') || cell.startsWith('F')) {
//             ws3Header[cell].s = { font: { bold: true } };
//         }
//     });

//     // ✅  Print Comparison Results to Console
//     console.table(comparisonResults);

//     return comparisonResults;
// }

// // ✅ Function to Export Data to Excel
// function exportToExcel(mainStageData, productionData, comparisonResults) {
//     const wb = xlsx.utils.book_new();

//     // Convert JSON data to worksheets
//     const ws1 = xlsx.utils.json_to_sheet(mainStageData);
//     const ws2 = xlsx.utils.json_to_sheet(productionData);
//     const ws3 = xlsx.utils.json_to_sheet(comparisonResults);

//     // Append worksheets to the workbook
//     xlsx.utils.book_append_sheet(wb, ws1, 'Main Stage');
//     xlsx.utils.book_append_sheet(wb, ws2, 'Production');
//     xlsx.utils.book_append_sheet(wb, ws3, 'Comparison Results');

//     // Save Excel file
//     let filePath = 'comparison_results_1.xlsx';
//     xlsx.writeFile(wb, filePath);
//     console.log(`📂 Excel file saved: ${filePath}`);
// }


// // Function definition
// async function runTest() {
//     // Your test code here
// }

// ✅ Run the test
//runTest();
