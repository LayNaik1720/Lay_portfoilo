/**
 * Exercises the dev database through mongoose the same way the app does.
 * Run with the dev database already listening on 27017.
 */
import mongoose from 'mongoose';

const URI = process.env.TEST_URI || 'mongodb://127.0.0.1:27017/devdb_smoke';
let passed = 0;
let failed = 0;

function check(label, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label} ${detail}`);
  }
}

await mongoose.connect(URI, { serverSelectionTimeoutMS: 8000 });
console.log('connected:', mongoose.connection.readyState === 1);
await mongoose.connection.db.dropDatabase();

const categorySchema = new mongoose.Schema({
  name: String,
  slug: { type: String, unique: true },
});
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true, index: true },
  sku: { type: String, unique: true },
  price: Number,
  stock: { type: Number, default: 0 },
  tags: [String],
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Cat' },
  variants: [{ color: String, size: String, stock: Number }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const Cat = mongoose.model('Cat', categorySchema);
const Product = mongoose.model('Product', productSchema);
await Promise.all([Cat.init(), Product.init()]);

// --- create
const cat = await Cat.create({ name: 'Sarees', slug: 'sarees' });
check('create() returns _id', !!cat._id);

const made = await Product.create([
  { name: 'Ruby Silk Saree', slug: 'ruby-silk-saree', sku: 'AAR-001', price: 8990, stock: 10, tags: ['silk', 'festive'], category: cat._id, variants: [{ color: 'Red', size: 'Free', stock: 6 }, { color: 'Green', size: 'Free', stock: 4 }] },
  { name: 'Ivory Chanderi Kurti', slug: 'ivory-chanderi-kurti', sku: 'AAR-002', price: 3490, stock: 4, tags: ['cotton'], category: cat._id, variants: [{ color: 'Ivory', size: 'M', stock: 4 }] },
  { name: 'Emerald Lehenga', slug: 'emerald-lehenga', sku: 'AAR-003', price: 24990, stock: 0, tags: ['bridal', 'festive'], category: cat._id, variants: [] },
]);
check('insertMany via create()', made.length === 3);

// --- timestamps & defaults
check('timestamps applied', made[0].createdAt instanceof Date);
check('schema default applied', made[2].isActive === true);

// --- find / filters
const all = await Product.find({});
check('find all', all.length === 3, `got ${all.length}`);

const inStock = await Product.find({ stock: { $gt: 0 } }).sort({ price: -1 });
check('$gt + sort desc', inStock.length === 2 && inStock[0].sku === 'AAR-001', JSON.stringify(inStock.map((p) => p.sku)));

const byTag = await Product.find({ tags: 'festive' });
check('array containment match', byTag.length === 2);

const regex = await Product.find({ name: { $regex: 'saree', $options: 'i' } });
check('$regex case-insensitive', regex.length === 1);

const paged = await Product.find({}).sort({ price: 1 }).skip(1).limit(1);
check('skip/limit pagination', paged.length === 1 && paged[0].sku === 'AAR-001', paged.map((p) => p.sku).join());

const projected = await Product.find({}, 'name price').lean();
check('projection excludes fields', projected[0].sku === undefined && !!projected[0].name);

// --- findOne / findById
const one = await Product.findOne({ slug: 'emerald-lehenga' });
check('findOne by slug', one?.sku === 'AAR-003');
const byId = await Product.findById(made[0]._id);
check('findById', byId?.sku === 'AAR-001');

// --- countDocuments / distinct
check('countDocuments', (await Product.countDocuments({ stock: { $gt: 0 } })) === 2);
const distinctTags = await Product.distinct('tags');
check('distinct on array field', distinctTags.sort().join() === 'bridal,cotton,festive,silk', distinctTags.join());

// --- updates
await Product.updateOne({ sku: 'AAR-001' }, { $inc: { stock: -2 } });
check('$inc decrements stock', (await Product.findOne({ sku: 'AAR-001' })).stock === 8);

await Product.updateOne({ sku: 'AAR-001', 'variants.color': 'Red' }, { $inc: { 'variants.$.stock': -2 } });
const posUpdated = await Product.findOne({ sku: 'AAR-001' });
check('positional $ operator on variant', posUpdated.variants.find((v) => v.color === 'Red').stock === 4,
  JSON.stringify(posUpdated.variants));

await Product.updateOne({ sku: 'AAR-002' }, { $push: { tags: 'new-arrival' } });
check('$push', (await Product.findOne({ sku: 'AAR-002' })).tags.includes('new-arrival'));

await Product.updateOne({ sku: 'AAR-002' }, { $addToSet: { tags: 'cotton' } });
check('$addToSet dedupes', (await Product.findOne({ sku: 'AAR-002' })).tags.filter((t) => t === 'cotton').length === 1);

await Product.updateOne({ sku: 'AAR-002' }, { $pull: { tags: 'new-arrival' } });
check('$pull', !(await Product.findOne({ sku: 'AAR-002' })).tags.includes('new-arrival'));

const fam = await Product.findOneAndUpdate({ sku: 'AAR-003' }, { $set: { stock: 5 } }, { new: true });
check('findOneAndUpdate returns new doc', fam.stock === 5);

const upserted = await Product.findOneAndUpdate(
  { sku: 'AAR-999' },
  { $set: { name: 'Upserted', slug: 'upserted', price: 100 } },
  { new: true, upsert: true },
);
check('upsert creates doc', upserted?.sku === 'AAR-999' && upserted.name === 'Upserted');

await Product.updateMany({ price: { $lt: 9000 } }, { $set: { isActive: true } });
check('updateMany', (await Product.countDocuments({ isActive: true })) >= 3);

// --- save() on a hydrated doc
const hydrated = await Product.findOne({ sku: 'AAR-002' });
hydrated.price = 3999;
hydrated.variants.push({ color: 'Sand', size: 'L', stock: 2 });
await hydrated.save();
const afterSave = await Product.findOne({ sku: 'AAR-002' });
check('save() persists changes', afterSave.price === 3999 && afterSave.variants.length === 2);

// --- unique index enforcement
let dupErr = null;
try {
  await Product.create({ name: 'Dup', slug: 'ruby-silk-saree', sku: 'AAR-777', price: 1 });
} catch (err) { dupErr = err; }
check('unique index rejects duplicate slug', !!dupErr && String(dupErr.message).includes('E11000'), dupErr?.message);

// --- validation
let valErr = null;
try { await Product.create({ slug: 'no-name', sku: 'AAR-778' }); } catch (err) { valErr = err; }
check('required validation fires', !!valErr);

// --- populate
const populated = await Product.findOne({ sku: 'AAR-001' }).populate('category');
check('populate() resolves ref', populated.category?.name === 'Sarees', JSON.stringify(populated.category));

// --- aggregation
const agg = await Product.aggregate([
  { $match: { price: { $gt: 0 } } },
  { $group: { _id: null, total: { $sum: '$price' }, avg: { $avg: '$price' }, count: { $sum: 1 } } },
]);
check('aggregate $group/$sum', agg[0]?.count === 4 && agg[0].total > 0, JSON.stringify(agg[0]));

const unwound = await Product.aggregate([
  { $unwind: '$variants' },
  { $group: { _id: '$variants.color', stock: { $sum: '$variants.stock' } } },
  { $sort: { _id: 1 } },
]);
check('aggregate $unwind + $group', unwound.length === 4, JSON.stringify(unwound));

const lookedUp = await Product.aggregate([
  { $match: { sku: 'AAR-001' } },
  { $lookup: { from: 'cats', localField: 'category', foreignField: '_id', as: 'cat' } },
  { $unwind: '$cat' },
  { $project: { sku: 1, catName: '$cat.name' } },
]);
check('aggregate $lookup', lookedUp[0]?.catName === 'Sarees', JSON.stringify(lookedUp));

const faceted = await Product.aggregate([
  { $facet: { byPrice: [{ $sort: { price: -1 } }, { $limit: 2 }, { $project: { sku: 1 } }], total: [{ $count: 'n' }] } },
]);
check('aggregate $facet', faceted[0]?.total[0]?.n === 4 && faceted[0].byPrice.length === 2, JSON.stringify(faceted[0]));

const exprMatch = await Product.find({ $expr: { $gt: ['$price', 8000] } });
check('$expr comparison', exprMatch.length === 2, exprMatch.map((p) => p.sku).join());

// --- $or / $and / $in
const orQuery = await Product.find({ $or: [{ sku: 'AAR-001' }, { sku: 'AAR-003' }] });
check('$or', orQuery.length === 2);
const inQuery = await Product.find({ sku: { $in: ['AAR-001', 'AAR-002'] } });
check('$in', inQuery.length === 2);
const andQuery = await Product.find({ $and: [{ price: { $gte: 3000 } }, { price: { $lte: 9000 } }] });
check('$and range', andQuery.length === 2, andQuery.map((p) => p.sku).join());

// --- elemMatch
const elem = await Product.find({ variants: { $elemMatch: { color: 'Red', stock: { $gt: 0 } } } });
check('$elemMatch on subdocs', elem.length === 1 && elem[0].sku === 'AAR-001');

// --- deletes
await Product.deleteOne({ sku: 'AAR-999' });
check('deleteOne', (await Product.countDocuments()) === 3);

// --- persistence across reconnect
await mongoose.disconnect();
await mongoose.connect(URI, { serverSelectionTimeoutMS: 8000 });
const Product2 = mongoose.models.Product;
check('data survives reconnect', (await Product2.countDocuments()) === 3);

await mongoose.connection.db.dropDatabase();
await mongoose.disconnect();

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
