/**
 * Singleton store for everything the boutique owner can configure without code:
 * shipping rules, homepage copy, boutique details, feature toggles.
 */
import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  key: { type: String, default: 'global', unique: true, index: true },

  brand: {
    name: { type: String, default: 'AARAVA' },
    tagline: { type: String, default: 'Tradition meets tomorrow' },
    logoText: { type: String, default: 'AARAVA' },
  },

  shipping: {
    freeShippingThreshold: { type: Number, default: 1000 },
    shippingCharge: { type: Number, default: 79 },
    codEnabled: { type: Boolean, default: true },
    codExtraCharge: { type: Number, default: 0 },
    estimatedDeliveryDays: { type: String, default: '4–7 business days' },
    dispatchDays: { type: Number, default: 2 },
    returnWindowDays: { type: Number, default: 7 },
  },

  contact: {
    email: { type: String, default: 'hello@aarava.com' },
    phone: { type: String, default: '+91 98765 43210' },
    whatsapp: { type: String, default: '919876543210' },
    instagram: { type: String, default: 'https://instagram.com' },
    facebook: { type: String, default: 'https://facebook.com' },
  },

  boutique: {
    name: { type: String, default: 'Aarava Flagship Boutique' },
    addressLine1: { type: String, default: '14 Rivergate Lane, Athwalines' },
    addressLine2: { type: String, default: 'Surat, Gujarat 395007' },
    openingHours: { type: String, default: 'Mon–Sat · 10:30 AM – 8:30 PM' },
    closedNote: { type: String, default: 'Sunday by appointment' },
    mapQuery: { type: String, default: 'Athwalines, Surat, Gujarat' },
    latitude: { type: Number, default: 21.1702 },
    longitude: { type: Number, default: 72.8311 },
    image: { type: String, default: '' },
  },

  homepage: {
    hero: {
      eyebrow: { type: String, default: 'TRADITION MEETS TOMORROW' },
      title: { type: String, default: 'Elegance for every you' },
      subtitle: { type: String, default: 'Discover handcrafted styles that celebrate your unique story.' },
      primaryLabel: { type: String, default: 'SHOP COLLECTION' },
      primaryLink: { type: String, default: '/shop' },
      secondaryLabel: { type: String, default: 'WATCH VIDEO' },
      secondaryLink: { type: String, default: '' },
      image: { type: String, default: '' },
      mobileImage: { type: String, default: '' },
      videoUrl: { type: String, default: '' },
    },
    collectionsHeading: { type: String, default: 'Shop by collection' },
    collectionsSubtitle: { type: String, default: 'Each edit is designed in small batches, cut by hand, and finished by artisans we have worked with for years.' },
    newArrivalsHeading: { type: String, default: 'New arrivals' },
    newArrivalsSubtitle: { type: String, default: 'The latest pieces to enter the atelier.' },
    bestSellersHeading: { type: String, default: 'Best sellers' },
    bestSellersSubtitle: { type: String, default: 'What everyone is loving right now.' },
    storyHeading: { type: String, default: 'Our story' },
    storyTitle: { type: String, default: 'A way of life' },
    storyBody: { type: String, default: 'Aarava began in a two-room studio in Surat with three weavers and a single loom. We still believe a garment should carry the fingerprint of the person who made it.' },
    storyImage: { type: String, default: '' },
    storyCtaLabel: { type: String, default: 'DISCOVER OUR STORY' },
    storiesHeading: { type: String, default: 'Featured stories' },
    storiesSubtitle: { type: String, default: 'Films, fittings and festival dressing from inside the boutique.' },
    testimonialsHeading: { type: String, default: 'What they say' },
    saleHeading: { type: String, default: 'Sale' },
    saleSubtitle: { type: String, default: 'Selected styles at special prices.' },
    promoBar: {
      type: [{
        icon: { type: String, default: 'tag' },
        title: { type: String, default: '' },
        subtitle: { type: String, default: '' },
      }],
      default: [
        { icon: 'tag', title: '10% OFF', subtitle: 'For new customers' },
        { icon: 'truck', title: 'Free shipping', subtitle: 'On orders above ₹1,000' },
        { icon: 'refresh', title: 'Easy returns', subtitle: 'Hassle free' },
        { icon: 'whatsapp', title: 'WhatsApp support', subtitle: 'Chat with us' },
      ],
    },
  },

  popup: {
    enabled: { type: Boolean, default: true },
    heading: { type: String, default: 'WELCOME TO OUR WORLD' },
    body: { type: String, default: 'Enjoy 10% OFF your first order.' },
    buttonLabel: { type: String, default: 'GET MY 10% OFF' },
    couponCode: { type: String, default: 'WELCOME10' },
    delaySeconds: { type: Number, default: 6 },
  },

  recentPurchasePopup: {
    enabled: { type: Boolean, default: true },
    intervalSeconds: { type: Number, default: 22 },
    lookbackDays: { type: Number, default: 30 },
  },

  footer: {
    about: { type: String, default: 'Handcrafted clothing made in small batches in Surat, Gujarat. Designed to be worn, repaired and kept.' },
    wordmark: { type: String, default: 'AARAVA' },
  },

  seo: {
    defaultTitle: { type: String, default: 'AARAVA — Handcrafted Boutique Fashion' },
    defaultDescription: { type: String, default: 'Handcrafted sarees, lehengas, kurtis and indo-western pieces from our boutique in Surat.' },
    ogImage: { type: String, default: '' },
  },
}, { timestamps: true });

/** Fetch the singleton settings document, creating it on first use. */
settingsSchema.statics.getSettings = async function getSettings() {
  let doc = await this.findOne({ key: 'global' });
  if (!doc) doc = await this.create({ key: 'global' });
  return doc;
};

export const Settings = mongoose.model('Settings', settingsSchema);
