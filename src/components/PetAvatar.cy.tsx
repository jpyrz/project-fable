import { mount } from 'cypress/react'
import { PetAvatar } from './PetAvatar'

describe('PetAvatar', () => {
  it('renders repository art instead of legacy equipment emoji', () => {
    mount(<PetAvatar pet={{ id: 'pet-1', name: 'Sprig', speciesId: 'mossling', palette: 0, pronouns: 'they/them', hunger: 80, mood: 80, cleanliness: 80, bondXp: 0, equipped: { head: 'item-16' }, appearance: { hair: 'mossling-hair-leafy-mohawk' } }} />)
    cy.get('[aria-label="Sprig the Mossling"]').should('be.visible')
    cy.get('[aria-label="Sprig the Mossling"]').should('not.contain.text', '👒')
    cy.get('img[src$="/base.png"]').should('have.length', 1)
    cy.get('img[src$="/hair-leafy-mohawk.png"]').should('have.length', 1)
  })

  it('hides a conflicting hair layer under fitted headwear', () => {
    mount(<PetAvatar pet={{ id: 'pet-2', name: 'Nova', speciesId: 'lumipup', palette: 0, pronouns: 'she/her', hunger: 80, mood: 80, cleanliness: 80, bondXp: 0, equipped: {}, appearance: { hair: 'lumipup-hair-nova-swoop', head: 'lumipup-head-sunhat' } }} />)
    cy.get('img[src$="/head-sunny-day-hat.png"]').should('have.length', 1)
    cy.get('img[src$="/hair-nova-swoop.png"]').should('not.exist')
  })

  it('renders a universal collectible background behind the pet', () => {
    mount(<PetAvatar pet={{ id: 'pet-3', name: 'Nimbus', speciesId: 'cloudkip', palette: 0, pronouns: 'they/them', hunger: 80, mood: 80, cleanliness: 80, bondXp: 120, equipped: {}, appearance: { background: 'background-garden' } }} />)
    cy.get('img[src$="/garden-backdrop.svg"]').should('have.length', 1)
    cy.get('img[src$="/base.png"]').should('have.length', 1)
  })

  it('lets a scene container own the collectible background', () => {
    mount(<PetAvatar showBackground={false} pet={{ id: 'pet-4', name: 'Nimbus', speciesId: 'cloudkip', palette: 0, pronouns: 'they/them', hunger: 80, mood: 80, cleanliness: 80, bondXp: 120, equipped: {}, appearance: { background: 'background-garden' } }} />)
    cy.get('img[src$="/garden-backdrop.svg"]').should('not.exist')
    cy.get('img[src$="/base.png"]').should('have.length', 1)
  })
})
