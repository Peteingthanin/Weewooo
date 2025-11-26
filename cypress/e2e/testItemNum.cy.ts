describe('Scan Page - Quantity Verification', () => {
  const API_URL = 'http://localhost:3000/api'; // Based on your server.js
  const ITEM_ID = 'MED001';
  let initialQuantity = 0;

  beforeEach(() => {
    // 1. Get the Initial "N" Quantity
    // We request the inventory directly from the backend
    cy.request(`${API_URL}/inventory`).then((response) => {
      expect(response.status).to.eq(200);
      
      // Find the specific item in the response array
      const item = response.body.items.find((i: any) => i.id === ITEM_ID);
      initialQuantity = item ? item.quantity : 0;
      
      cy.log(`Initial Quantity for ${ITEM_ID}: ${initialQuantity}`);
    });

    // 2. Visit the page and setup intercept
    cy.visit('http://localhost:8081/scan');
    cy.intercept('POST', '**/api/action/log').as('logAction');
  });

  it('should increment item quantity by 1 after Check In', () => {
    // 3. Perform UI Actions
    // Click "Check In"
    cy.contains('Check In')
      .should('exist')
      .click({ force: true });

    // Click "MED001"
    cy.contains(ITEM_ID)
      .scrollIntoView()
      .click({ force: true });

    // 4. Wait for the POST request to finish
    cy.wait('@logAction').then((interception) => {
      expect(interception.response?.statusCode).to.eq(200);
    });

    // 5. Verify "N + 1" Quantity
    // We request the inventory again to check the new state
    cy.request(`${API_URL}/inventory`).then((response) => {
      const item = response.body.items.find((i: any) => i.id === ITEM_ID);
      const newQuantity = item ? item.quantity : 0;
      
      cy.log(`New Quantity for ${ITEM_ID}: ${newQuantity}`);

      // THE ASSERTION: Expect N + 1
      expect(newQuantity).to.eq(initialQuantity + 1);
    });
  });
});