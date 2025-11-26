describe('Scan Page - Check in & Valid Code', () => {
  beforeEach(() => {
    cy.visit('http://localhost:8081/scan');
  });
  
  //Check-in & Valid Code
  it('should successfully submit a manually entered barcode', () => {
    // Setup
    const alertStub = cy.stub().as('alertStub');
    cy.on('window:alert', alertStub);
    cy.wait(2000);
    // 1. Enter valid Barcode
    const validCode = 'MED001';
    cy.get('input[placeholder="Enter barcode or scan..."]')
      .scrollIntoView()
      .should('exist')
      .click({ force: true }) 
      .type(validCode, { force: true, delay: 100 });

    // 2. Click Submit Scan
    cy.contains('Submit Scan')
      .scrollIntoView()
      .should('exist')
      .click({ force: true });

    // Check the alert was called with the expected message
    cy.get('@alertStub', { timeout: 10000 }).should(
      'have.been.calledWith', 
      `Logged action for item: ${validCode} (Check In, Quantity 1)`
    );
  });
});

describe('Scan Page - Check in & Invalid Code', () => {
  beforeEach(() => {
    cy.visit('http://localhost:8081/scan');
  });


  //Check-in & Invalid Code
  it('should successfully submit a manually entered barcode', () => {
    // Setup
    const alertStub = cy.stub().as('alertStub');
    cy.on('window:alert', alertStub);
    cy.wait(2000);
    
    // 1. Enter invalid Barcode
    const invalidCode = 'Aj. Chaiyong very handsome';
    cy.get('input[placeholder="Enter barcode or scan..."]')
      .scrollIntoView()
      .should('exist')
      .click({ force: true }) 
      .type(invalidCode, { force: true, delay: 100 });

    // 2. Click Submit Scan
    cy.contains('Submit Scan')
      .scrollIntoView()
      .should('exist')
      .click({ force: true });

    // Check the alert was called with the expected message
    cy.get('@alertStub').should(
      'have.been.calledWith', 
      `Invalid QR code: "${invalidCode}". Please scan or enter a valid code.`
    );
  });
});

//Check-out & Valid Code
describe('Scan Page - Check Out Verification', () => {
  beforeEach(() => {
    cy.visit('http://localhost:8081/scan');
  });

  it('should successfully check out an item (Check Out Mode)', () => {
    // Setup
    cy.intercept('POST', '**/api/action/log').as('logAction');
    const alertStub = cy.stub().as('alertStub');
    cy.on('window:alert', alertStub);
    cy.wait(2000);

    // 1. Click "Check Out" Button
    cy.contains('Check Out')
      .scrollIntoView()
      .should('exist')
      .click({ force: true });
    
    // 2. Enter Valid Item Code
    const validCode = 'MED001';
    cy.get('input[placeholder="Enter barcode or scan..."]')
      .scrollIntoView()
      .should('exist')
      .click({ force: true })
      .type(validCode, { force: true, delay: 100 });

    // 3. Click Submit Scan
    cy.contains('Submit Scan')
      .scrollIntoView()
      .click({ force: true });

    // Check the alert was called with the expected message
    cy.get('@alertStub').should(
      'have.been.calledWith', 
      `Logged action for item: ${validCode} (Check Out, Quantity 1)`
    );
  });
  describe('Scan Page - Check Out Verification', () => {
  beforeEach(() => {
    cy.visit('http://localhost:8081/scan');
  });


  //Check-out & Invalid Code
  it('should successfully check out an item (Check Out Mode)', () => {
    // Setup
    cy.intercept('POST', '**/api/action/log').as('logAction');
    const alertStub = cy.stub().as('alertStub');
    cy.on('window:alert', alertStub);
    cy.wait(2000);

    // 1. Click "Check Out" Button
    cy.contains('Check Out')
      .scrollIntoView()
      .should('exist')
      .click({ force: true });
    
    // 2. Enter invalid barcode
    const invalidCode = 'We Love Aj. Chaiyong';
    cy.get('input[placeholder="Enter barcode or scan..."]')
      .scrollIntoView()
      .should('exist')
      .click({ force: true })
      .type(invalidCode, { force: true, delay: 100 });

    // 3. Click Submit Scan
    cy.contains('Submit Scan')
      .scrollIntoView()
      .click({ force: true });

    // Check the alert was called with the expected message
    cy.get('@alertStub').should(
      'have.been.calledWith', 
      `Invalid QR code: "${invalidCode}". Please scan or enter a valid code.`
    );
  });
});

//Check-out & Valid Code & Out of Stock
describe('Scan Page - Out of Stock Verification', () => {
  beforeEach(() => {
    // Setup: force SUP002 out of stock
    cy.intercept('GET', '**/api/inventory', (req) => {
      req.continue((res) => {
        if (res.body && res.body.items) {
          const item = res.body.items.find((i: any) => i.id === 'SUP002');
          if (item) {
            item.quantity = 0; // Force "Out of Stock" for this test session
          }
        }
      });
    }).as('getInventory');

    cy.visit('http://localhost:8081/scan');
  });

  it('should show failure alert when checking out an out-of-stock item', () => {
    const alertStub = cy.stub().as('alertStub');
    cy.on('window:alert', alertStub);
    cy.wait(2000);

    // Click “Check Out” Button
    cy.contains('Check Out')
      .scrollIntoView()
      .should('exist')
      .click({ force: true });

    // Enter valid barcode
    const targetCode = 'SUP002';
    const expectedItemName = 'Medical Gloves (Box)';
    cy.get('input[placeholder="Enter barcode or scan..."]')
      .scrollIntoView()
      .should('exist')
      .click({ force: true })
      .type(targetCode, { force: true, delay: 100 });

    // Click Submit Scan
    cy.contains('Submit Scan')
      .scrollIntoView()
      .click({ force: true });

    // Check the alert was called with the expected message
    cy.get('@alertStub').should(
      'have.been.calledWith', 
      `Action failed: Item '${expectedItemName}' is out of stock.`
    );
  });
});
});