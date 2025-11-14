describe('Agents list smoke', () => {
  it('loads travel agents list page', () => {
    cy.visit('http://localhost:5173/admin/base/travel_agents_list');
    cy.contains('Travel Agents');
  });
});


