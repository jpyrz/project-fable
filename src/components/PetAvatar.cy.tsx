import { mount } from 'cypress/react'
import { PetAvatar } from './PetAvatar'

describe('PetAvatar', () => {
  it('renders repository art instead of legacy equipment emoji', () => {
    mount(<PetAvatar pet={{ id: 'pet-1', name: 'Sprig', speciesId: 'mossling', palette: 0, pronouns: 'they/them', hunger: 80, mood: 80, cleanliness: 80, equipped: { head: 'item-16' }, appearance: { hair: 'mossling-hair-leafy-mohawk' } }} />)
    cy.get('[aria-label="Sprig the Mossling"]').should('be.visible')
    cy.get('[aria-label="Sprig the Mossling"]').should('not.contain.text', '👒')
    cy.get('img[src$="/base.png"]').should('have.length', 1)
    cy.get('img[src$="/hair-leafy-mohawk.png"]').should('have.length', 1)
  })

  it('hides a conflicting hair layer under fitted headwear', () => {
    mount(<PetAvatar pet={{ id: 'pet-2', name: 'Nova', speciesId: 'lumipup', palette: 0, pronouns: 'she/her', hunger: 80, mood: 80, cleanliness: 80, equipped: {}, appearance: { hair: 'lumipup-hair-nova-swoop', head: 'lumipup-head-sunhat' } }} />)
    cy.get('img[src$="/head-sunny-day-hat.png"]').should('have.length', 1)
    cy.get('img[src$="/hair-nova-swoop.png"]').should('not.exist')
  })
})
