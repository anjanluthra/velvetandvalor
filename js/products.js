/**
 * Velvet & Valor — Product Data
 * All phone case SKUs, designs, models, and pricing
 */

const VV_PRODUCTS = {
  currency: 'USD',
  currencySymbol: '$',
  basePrice: 55.00,

  designs: [
    {
      id: 'champagne-nude',
      name: 'Champagne Nude',
      slug: 'champagne-nude',
      image: 'images/nude product image.webp',
      color: '#D4B896',
      description: 'Understated elegance in warm champagne tones with subtle equestrian detailing.'
    },
    {
      id: 'blush-rose',
      name: 'Blush Rose',
      slug: 'blush-rose',
      image: 'images/pink product image.webp',
      color: '#D4A0A0',
      description: 'Soft rose hues meet bold equestrian lines — feminine strength, redefined.'
    },
    {
      id: 'royal-plum',
      name: 'Royal Plum',
      slug: 'royal-plum',
      image: 'images/plum product image.webp',
      color: '#6B3A6B',
      description: 'Deep plum tones inspired by twilight rides and the quiet power of the arena.'
    },
    {
      id: 'emerald-teal',
      name: 'Emerald Teal',
      slug: 'emerald-teal',
      image: 'images/teal product image.webp',
      color: '#1A7070',
      description: 'Rich teal with gold accents — where heritage meets modern confidence.'
    }
  ],

  models: [
    { id: 'iphone-17',          name: 'iPhone 17',          generation: '17' },
    { id: 'iphone-17-air',      name: 'iPhone 17 Air',      generation: '17' },
    { id: 'iphone-17-pro',      name: 'iPhone 17 Pro',      generation: '17' },
    { id: 'iphone-17-pro-max',  name: 'iPhone 17 Pro Max',  generation: '17' },
    { id: 'iphone-16',          name: 'iPhone 16',          generation: '16' },
    { id: 'iphone-16-pro',      name: 'iPhone 16 Pro',      generation: '16' },
    { id: 'iphone-16-pro-max',  name: 'iPhone 16 Pro Max',  generation: '16' },
    { id: 'iphone-16-plus',     name: 'iPhone 16 Plus',     generation: '16' },
    { id: 'iphone-15',          name: 'iPhone 15',          generation: '15' },
    { id: 'iphone-15-pro',      name: 'iPhone 15 Pro',      generation: '15' },
    { id: 'iphone-15-pro-max',  name: 'iPhone 15 Pro Max',  generation: '15' },
    { id: 'iphone-15-plus',     name: 'iPhone 15 Plus',     generation: '15' },
    { id: 'iphone-14',          name: 'iPhone 14',          generation: '14' },
    { id: 'iphone-14-pro',      name: 'iPhone 14 Pro',      generation: '14' },
    { id: 'iphone-14-pro-max',  name: 'iPhone 14 Pro Max',  generation: '14' },
    { id: 'iphone-14-plus',     name: 'iPhone 14 Plus',     generation: '14' },
    { id: 'iphone-13',          name: 'iPhone 13',          generation: '13' },
    { id: 'iphone-13-pro',      name: 'iPhone 13 Pro',      generation: '13' },
    { id: 'iphone-13-pro-max',  name: 'iPhone 13 Pro Max',  generation: '13' },
  ],

  surfaces: ['Glossy', 'Matte'],

  /**
   * Generate a SKU string
   * Format: VV-{DESIGN}-{MODEL}-{SURFACE}
   */
  generateSKU(designId, modelId, surface) {
    const s = surface.toLowerCase().substring(0, 3);
    return `VV-${designId}-${modelId}-${s}`.toUpperCase();
  },

  /**
   * Get all products for a given design
   */
  getProductsByDesign(designId) {
    const design = this.designs.find(d => d.id === designId);
    if (!design) return [];
    return this.models.flatMap(model =>
      this.surfaces.map(surface => ({
        sku: this.generateSKU(designId, model.id, surface),
        design,
        model,
        surface,
        price: this.basePrice,
        currency: this.currency,
        name: `${design.name} — ${model.name} (${surface})`,
        image: design.image
      }))
    );
  },

  /**
   * Get all products for a given model
   */
  getProductsByModel(modelId) {
    const model = this.models.find(m => m.id === modelId);
    if (!model) return [];
    return this.designs.flatMap(design =>
      this.surfaces.map(surface => ({
        sku: this.generateSKU(design.id, modelId, surface),
        design,
        model,
        surface,
        price: this.basePrice,
        currency: this.currency,
        name: `${design.name} — ${model.name} (${surface})`,
        image: design.image
      }))
    );
  },

  /**
   * Get all unique generations for filtering
   */
  getGenerations() {
    return [...new Set(this.models.map(m => m.generation))].sort((a, b) => b - a);
  },

  /**
   * Get models by generation
   */
  getModelsByGeneration(gen) {
    return this.models.filter(m => m.generation === gen);
  },

  /**
   * Total SKU count
   */
  get totalSKUs() {
    return this.designs.length * this.models.length * this.surfaces.length;
  }
};
