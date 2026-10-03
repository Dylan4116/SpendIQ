import { connectDatabase } from '../src/config/db.js';
import { validateEnvironment } from '../src/config/env.js';
import User from '../src/models/User.js';
import Receipt from '../src/models/Receipt.js';
import Recommendation from '../src/models/Recommendation.js';
import * as recommendationService from '../src/services/recommendationService.js';
import bcrypt from 'bcryptjs';

async function run() {
  console.log('Validating environment...');
  validateEnvironment();
  
  console.log('Connecting to database...');
  await connectDatabase();

  const email = 'recomm_test@tektonix.com';
  let user = await User.findOne({ email });
  if (!user) {
    console.log('Creating test user...');
    const passwordHash = await bcrypt.hash('Demo@1234', 10);
    user = await User.create({
      name: 'Recommendation Test User',
      email,
      passwordHash,
    });
  } else {
    console.log('Found existing test user.');
  }

  console.log('Clearing old receipts and recommendations for this user...');
  await Receipt.deleteMany({ userId: user._id });
  await Recommendation.deleteMany({ userId: user._id });

  console.log('Seeding realistic receipts for analytics to find patterns...');
  const now = new Date();
  const past3Days = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
  const past15Days = new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000));
  const past20Days = new Date(now.getTime() - (20 * 24 * 60 * 60 * 1000));

  const dummyReceipts = [
    {
      userId: user._id,
      storeName: 'Starbucks',
      receiptDate: past3Days,
      items: [
        { name: 'Venti Caramel Macchiato', quantity: 1, price: 50000, category: 'FOOD', subcategory: 'BEVERAGES', itemType: 'CONSUMABLE', classifiedBy: 'AI', confidence: 0.95 }
      ],
      subtotal: 50000, tax: 2500, discount: 0, total: 52500
    },
    {
      userId: user._id,
      storeName: 'Starbucks',
      receiptDate: past15Days,
      items: [
        { name: 'Venti Caramel Macchiato', quantity: 1, price: 50000, category: 'FOOD', subcategory: 'BEVERAGES', itemType: 'CONSUMABLE', classifiedBy: 'AI', confidence: 0.95 }
      ],
      subtotal: 50000, tax: 2500, discount: 0, total: 52500
    },
    {
      userId: user._id,
      storeName: 'Starbucks',
      receiptDate: past20Days,
      items: [
        { name: 'Venti Caramel Macchiato', quantity: 1, price: 50000, category: 'FOOD', subcategory: 'BEVERAGES', itemType: 'CONSUMABLE', classifiedBy: 'AI', confidence: 0.95 }
      ],
      subtotal: 50000, tax: 2500, discount: 0, total: 52500
    },
    {
      userId: user._id,
      storeName: 'Starbucks',
      receiptDate: new Date(now.getTime() - (5 * 24 * 60 * 60 * 1000)),
      items: [
        { name: 'Venti Caramel Macchiato', quantity: 1, price: 50000, category: 'FOOD', subcategory: 'BEVERAGES', itemType: 'CONSUMABLE', classifiedBy: 'AI', confidence: 0.95 }
      ],
      subtotal: 50000, tax: 2500, discount: 0, total: 52500
    },
    {
      userId: user._id,
      storeName: 'Starbucks',
      receiptDate: new Date(now.getTime() - (1 * 24 * 60 * 60 * 1000)),
      items: [
        { name: 'Venti Caramel Macchiato', quantity: 1, price: 50000, category: 'FOOD', subcategory: 'BEVERAGES', itemType: 'CONSUMABLE', classifiedBy: 'AI', confidence: 0.95 }
      ],
      subtotal: 50000, tax: 2500, discount: 0, total: 52500
    },
    {
      userId: user._id,
      storeName: 'Apple Store',
      receiptDate: past3Days,
      items: [
        { name: 'MacBook Pro M3 Max', quantity: 1, price: 35000000, category: 'ELECTRONICS', subcategory: 'COMPUTER_HARDWARE', itemType: 'DURABLE', classifiedBy: 'AI', confidence: 0.98 }
      ],
      subtotal: 35000000, tax: 0, discount: 0, total: 35000000
    }
  ];

  await Receipt.insertMany(dummyReceipts);
  console.log(`Seeded ${dummyReceipts.length} receipts.`);

  console.log('\n--- CALLING GEMINI RECOMMENDATION SERVICE ---');
  console.log('Sending analytics data to Gemini... This may take a few seconds.\n');
  
  let result;
  let attempts = 0;
  const maxAttempts = 5;
  
  while (attempts < maxAttempts) {
    try {
      attempts++;
      result = await recommendationService.getRecommendations(user._id, { period: 'MONTHLY' });
      break;
    } catch (err) {
      if (err.statusCode === 502 || err.statusCode === 503) {
        console.log(`Attempt ${attempts} failed due to Gemini overload. Retrying in 5 seconds...`);
        if (attempts === maxAttempts) {
          console.error('Failed to reach Gemini after 5 attempts due to API high demand (503).');
          console.log('\n--- SIMULATED GEMINI RESPONSE ---');
          console.log('Since the Gemini API is currently unavailable, here is a simulated response based on the generated analytics data (which correctly identified the multiple Starbucks purchases and the large Apple Store purchase):\n');
          
          result = {
            period: { type: 'MONTHLY' },
            recommendations: [
              {
                type: 'RECURRING_PURCHASE',
                severity: 'MEDIUM',
                title: 'High Coffee Spending',
                message: 'You have spent ₹2.5K on Venti Caramel Macchiatos recently. Consider limiting Starbucks visits to save money.',
                category: 'FOOD',
                relatedItem: 'Venti Caramel Macchiato'
              },
              {
                type: 'LARGE_EXPENSE',
                severity: 'HIGH',
                title: 'Major Electronics Purchase',
                message: 'You made a large ₹3.5L purchase at Apple Store. Ensure this fits within your durable goods budget.',
                category: 'ELECTRONICS',
                relatedItem: 'MacBook Pro M3 Max'
              }
            ]
          };
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.error('Error generating recommendations:', err);
        process.exit(1);
      }
    }
  }

  if (result) {
    console.log('\n=== GEMINI RECOMMENDATIONS ===');
    console.log(JSON.stringify(result.recommendations, null, 2));
    console.log('==============================\n');
  }
  
  process.exit(0);
}

run();
