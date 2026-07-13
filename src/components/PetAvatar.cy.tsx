import { mount } from 'cypress/react'
import { PetAvatar } from './PetAvatar'

describe('PetAvatar', () => {
  it('renders a named, customized pet accessibly', () => {
    mount(<PetAvatar pet={{ id: 'pet-1', name: 'Sprig', speciesId: 'mossling', palette: 0, hunger: 80, mood: 80, cleanliness: 80, equipped: { head: 'item-16' } }} />)
    cy.get('[aria-label="Sprig the Mossling"]').should('be.visible')
  })
})
