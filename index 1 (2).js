const { Builder, By, until } = require('selenium-webdriver');
require('geckodriver');  // Ensure geckodriver is included

async function enterValueIntoInputField() {
    // Start Firefox browser session
    let driver = await new Builder().forBrowser('firefox').build();

    try {
        // Navigate to the webpage (replace with the actual URL)
        await driver.get('https://auth.vebuin.com/auth/realms/smartflow/protocol/openid-connect/auth?client_id=smartflow_public&redirect_uri=https%3A%2F%2Fsmartflow.vebuin.com%2Fm_user_login%2Fagency%2F3%2Fsign_in%3Fclear&state=1cc9e66f-6d89-491c-876b-b1eec0d52e5a&response_mode=fragment&response_type=code&scope=openid&nonce=4b53c5b6-b19a-4fc6-8acc-98a1c42282c0&code_challenge=HkgKZEmwjx63Vdh5k03GhrEyxrf4Orns00SBMFEQhNw&code_challenge_method=S256');  // Replace with your desired URL

        // Wait for the input field to be present (change selector as needed)
        await driver.wait(until.elementLocated(By.name('username')), 10000);  // Example selector: 'input[name="username"]'

        // Find the input field (example selector: 'input[name="username"]')
        let inputField = await driver.findElement(By.name('username'));

        // Clear the field (optional) before entering a new value (important if the field already contains data)
        await inputField.clear();

        // Enter the value into the input field
        await inputField.sendKeys('milind@thinkbiz.co.in');  // Replace with the desired value

        // Wait for the input field to be present (change selector as needed)
        await driver.wait(until.elementLocated(By.name('password')), 10000);  // Example selector: 'input[name="username"]'

        // Find the input field (example selector: 'input[name="username"]')
        let passwordField = await driver.findElement(By.name('password'));

        // Clear the field (optional) before entering a new value (important if the field already contains data)
        await passwordField.clear();

        // Enter the value into the input field
        await passwordField.sendKeys('password');  // Replace with the desired value

        // Optional: Verify that the value has been entered (you can assert this if needed)
        let enteredValue = await inputField.getAttribute('value');
        console.log('Entered value:', enteredValue);  // Log the entered value to the console

        // Click the login button
        await driver.findElement(By.className('submit')).click(); // Replace with actual button ID

        // Wait for the next page to load (optional)
        await driver.wait(until.urlContains('dashboard'), 10000000); // Adjust based on expected behavior
        console.log('Login successful!');

        // Wait for the loader to disappear before clicking
        // await driver.wait(until.elementIsNotVisible(driver.findElement(By.className('loader-container'))), 10000);

        // Locate the desired element (All Items link)
        let element = await driver.wait(
            until.elementLocated(By.css('[href="#/app/dashboard/items/3/"]')), 
            10000 // Wait for up to 10 seconds
        );

        // Wait for the element to be visible
        await driver.wait(until.elementIsVisible(element), 5000);

        // Scroll the element into view to ensure it's clickable
        await driver.executeScript('arguments[0].scrollIntoView(true);', element);

        // Wait for the element to be clickable
        await driver.wait(until.elementIsVisible(element), 5000);
        
        // Use JavaScript to click if regular click is blocked
        await driver.executeScript('arguments[0].click();', element);
        console.log('Element clicked successfully');

        // Locate the Approved element using XPath or CSS
        let elementApproved = await driver.wait(
            until.elementLocated(By.xpath('//li[@class="ng-scope active"]/a/span[text()="Approved"]')), // Adjust XPath to select the "Approved" tab
            10000 // Wait for up to 10 seconds
        );

        // Wait for the element to be visible
        await driver.wait(until.elementIsVisible(elementApproved), 5000);

        // Scroll the element into view to ensure it's clickable
        await driver.executeScript('arguments[0].scrollIntoView(true);', elementApproved);

        // Wait for the element to be enabled
        await driver.wait(until.elementIsEnabled(elementApproved), 5000); 

        // Click the element using JavaScript if regular click is blocked
        await driver.executeScript('arguments[0].click();', elementApproved);
        console.log('Approved tab clicked successfully');
        // **************************** dont change above anything ****************************//
        
        // Wait for the table to load and be visible
        let table = await driver.wait(until.elementLocated(By.css('table.table')), 30000);
        console.log('Table is located');

        // Ensure the table is visible
        await driver.wait(until.elementIsVisible(table), 30000);
        console.log('Table is visible');

        // Locate the first anchor tag directly (simplified)
        let anchor = await driver.wait(until.elementLocated(By.css('table.table tr:nth-child(1) td a')), 30000); // Adjust this if needed
        console.log('Anchor tag located');

        // Wait for the anchor tag to be visible
        await driver.wait(until.elementIsVisible(anchor), 20000);
        console.log('Anchor tag is visible');

        // Scroll the anchor tag into view
        await driver.executeScript('arguments[0].scrollIntoView(true);', anchor);
        console.log('Scrolled to the anchor tag');

        // Wait for the anchor tag to become clickable
        await driver.wait(until.elementIsEnabled(anchor), 5000);

        // Click on the anchor tag using JavaScript
        await driver.executeScript('arguments[0].click();', anchor);
        console.log('Clicked the anchor tag successfully!');

        // **************************** dont change above anything ****************************//

        
    } catch (err) {
        console.error('Error:', err);
        await driver.quit();  // comment if you want to close the browser after execution
    } finally {
        // Close the browser session
        // await driver.quit();  // Uncomment if you want to close the browser after execution
    }
}

enterValueIntoInputField();
