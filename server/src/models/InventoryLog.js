import mongoose from 'mongoose';

const inventoryLogSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  variantId: { type: mongoose.Schema.Types.ObjectId, default: null },
  sku: { type: String, default: '', index: true },
  previousStock: { type: Number, required: true },
  adjustment: { type: Number, required: true },
  newStock: { type: Number, required: true },
  reason: {
    type: String,
    enum: ['order_placed', 'order_cancelled', 'order_returned', 'manual_adjustment', 'restock', 'correction', 'seed'],
    required: true,
  },
  note: { type: String, default: '' },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  performedBy: { type: String, default: 'system' },
  isDemo: { type: Boolean, default: false },
}, { timestamps: true });

inventoryLogSchema.index({ createdAt: -1 });

export const InventoryLog = mongoose.model('InventoryLog', inventoryLogSchema);
