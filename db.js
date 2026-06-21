const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

// Ensure the data directory exists
async function init() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

// Get file path for a collection
async function getFilePath(collection) {
  await init();
  return path.join(DATA_DIR, `${collection}.json`);
}

// Read records from a file
async function read(collection) {
  const filePath = await getFilePath(collection);
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return []; // Return empty array if file doesn't exist yet
    }
    throw err;
  }
}

// Write records to a file
async function write(collection, data) {
  const filePath = await getFilePath(collection);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Find all records in a collection
 */
async function findAll(collection) {
  return await read(collection);
}

/**
 * Find record by ID
 */
async function findById(collection, id) {
  const items = await read(collection);
  return items.find(item => item.id === id);
}

/**
 * Insert a new record
 */
async function insert(collection, item) {
  const items = await read(collection);
  const newItem = {
    id: Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
    createdAt: new Date().toISOString(),
    ...item
  };
  items.push(newItem);
  await write(collection, items);
  return newItem;
}

/**
 * Update an existing record by ID
 */
async function update(collection, id, updatedFields) {
  const items = await read(collection);
  const index = items.findIndex(item => item.id === id);
  if (index === -1) return null;

  items[index] = {
    ...items[index],
    ...updatedFields,
    updatedAt: new Date().toISOString()
  };

  await write(collection, items);
  return items[index];
}

/**
 * Delete a record by ID
 */
async function remove(collection, id) {
  const items = await read(collection);
  const filtered = items.filter(item => item.id !== id);
  if (items.length === filtered.length) return false;
  await write(collection, filtered);
  return true;
}

module.exports = {
  findAll,
  findById,
  insert,
  update,
  remove
};
