describe('Scan Page - Alert Verification', () => {
  beforeEach(() => {
    cy.visit('http://localhost:8081/scan');
  });

  it('should show the correct alert message when checking in', () => {
    // Setup: Stub window.alert using cy.on
    // This captures the alert event at the browser level
    const alertStub = cy.stub().as('alertStub');
    cy.on('window:alert', alertStub);
    // 2 sec delay to wait for components to load
    cy.wait(2000);

    // 3. Ensure "Check In" is selected
    cy.contains('Check In')
      .scrollIntoView()
      .click({ force: true });

    // 4. Click the "MED001" button
    // We scroll it into view and ensure it exists before forcing the click
    cy.contains('MED001')
      .scrollIntoView()
      .should('exist') 
      .click({ force: true });

    // 5. Assertion: Check the alert was called
    // We increase the timeout slightly to allow for any async state updates
    cy.get('@alertStub', { timeout: 10000 }).should(
      'have.been.calledWith', 
      'Logged action for item: MED001 (Check In, Quantity 1)'
    );
  });
});