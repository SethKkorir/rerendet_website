import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const dropIndex = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`📡 Connected to MongoDB: ${conn.connection.host}`);

        const collection = conn.connection.collection('products');

        // The error identified this index name:
        const indexName = "name_text_description_text_flavorNotes_text_tags_text";

        console.log(`🗑️ Attempting to drop index: ${indexName}...`);

        try {
            await collection.dropIndex(indexName);
            console.log('✅ Index dropped successfully!');
        } catch (err) {
            if (err.codeName === 'IndexNotFound') {
                console.log('⚠️ Index not found, it might have been dropped already or has a different name.');

                // Let's list indexes to be sure
                const indexes = await collection.listIndexes().toArray();
                console.log('Current indexes:');
                indexes.forEach(idx => console.log(` - ${idx.name} (${Object.keys(idx.key).join(', ')})`));

                const textIndex = indexes.find(idx => Object.values(idx.key).includes('text'));
                if (textIndex) {
                    console.log(`🔍 Found text index: ${textIndex.name}. Dropping it...`);
                    await collection.dropIndex(textIndex.name);
                    console.log('✅ Text index dropped successfully!');
                }
            } else {
                throw err;
            }
        }

        console.log('🚀 Index fix complete. You can now restart the server.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error fixing indices:', err);
        process.exit(1);
    }
};

dropIndex();
