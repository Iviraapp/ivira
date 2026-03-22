export async function seed(knex) {
  await knex('indian_food_atlas').del()
  await knex('indian_food_atlas').insert([
    // Grains & Breads
    { food_name: 'Roti (Chapati)', regional_alias: 'रोटी', category: 'grain', serving_unit: 'piece', serving_size: 1, calories: 104, protein: 3.1, carbs: 18.3, fats: 2.5, fiber: 1.9, tags: JSON.stringify(['veg']) },
    { food_name: 'Plain Rice (Steamed)', regional_alias: 'चावल', category: 'grain', serving_unit: 'katori', serving_size: 1, calories: 180, protein: 3.5, carbs: 39, fats: 0.4, fiber: 0.6, tags: JSON.stringify(['veg', 'gluten-free']) },
    { food_name: 'Paratha (Plain)', regional_alias: 'पराठा', category: 'grain', serving_unit: 'piece', serving_size: 1, calories: 180, protein: 4.1, carbs: 23, fats: 7.5, fiber: 1.8, tags: JSON.stringify(['veg']) },
    { food_name: 'Naan', regional_alias: 'नान', category: 'grain', serving_unit: 'piece', serving_size: 1, calories: 262, protein: 8.7, carbs: 43, fats: 5.1, fiber: 1.8, tags: JSON.stringify(['veg']) },
    { food_name: 'Puri', regional_alias: 'पूरी', category: 'grain', serving_unit: 'piece', serving_size: 1, calories: 101, protein: 1.6, carbs: 10.4, fats: 5.9, fiber: 0.5, tags: JSON.stringify(['veg']) },
    { food_name: 'Dosa (Plain)', regional_alias: 'दोसा', category: 'grain', serving_unit: 'piece', serving_size: 1, calories: 168, protein: 4.5, carbs: 28, fats: 4.2, fiber: 1.2, tags: JSON.stringify(['veg', 'gluten-free']) },
    { food_name: 'Idli', regional_alias: 'इडली', category: 'grain', serving_unit: 'piece', serving_size: 1, calories: 58, protein: 2.1, carbs: 10.8, fats: 0.4, fiber: 0.5, tags: JSON.stringify(['veg', 'gluten-free']) },
    { food_name: 'Upma', regional_alias: 'उपमा', category: 'grain', serving_unit: 'katori', serving_size: 1, calories: 210, protein: 5.2, carbs: 32, fats: 7.1, fiber: 2.1, tags: JSON.stringify(['veg']) },
    { food_name: 'Poha', regional_alias: 'पोहा', category: 'grain', serving_unit: 'katori', serving_size: 1, calories: 178, protein: 3.8, carbs: 33, fats: 3.5, fiber: 1.5, tags: JSON.stringify(['veg', 'gluten-free']) },
    // Dals & Lentils
    { food_name: 'Dal Tadka', regional_alias: 'दाल तड़का', category: 'dal', serving_unit: 'katori', serving_size: 1, calories: 130, protein: 7.5, carbs: 16.5, fats: 3.8, fiber: 3.2, tags: JSON.stringify(['veg', 'gluten-free']) },
    { food_name: 'Rajma', regional_alias: 'राजमा', category: 'dal', serving_unit: 'katori', serving_size: 1, calories: 165, protein: 9, carbs: 24, fats: 3.5, fiber: 5.8, tags: JSON.stringify(['veg', 'gluten-free']) },
    { food_name: 'Chana Masala', regional_alias: 'छोले', category: 'dal', serving_unit: 'katori', serving_size: 1, calories: 180, protein: 8.5, carbs: 26, fats: 4.8, fiber: 6.5, tags: JSON.stringify(['veg', 'gluten-free']) },
    { food_name: 'Sambar', regional_alias: 'सांभर', category: 'dal', serving_unit: 'katori', serving_size: 1, calories: 115, protein: 5.5, carbs: 16, fats: 3.2, fiber: 3.5, tags: JSON.stringify(['veg', 'gluten-free']) },
    { food_name: 'Moong Dal', regional_alias: 'मूंग दाल', category: 'dal', serving_unit: 'katori', serving_size: 1, calories: 120, protein: 8.2, carbs: 15, fats: 2.5, fiber: 3.8, tags: JSON.stringify(['veg', 'gluten-free']) },
    // Sabzi (Vegetables)
    { food_name: 'Palak Paneer', regional_alias: 'पालक पनीर', category: 'sabzi', serving_unit: 'katori', serving_size: 1, calories: 220, protein: 12, carbs: 8.5, fats: 16, fiber: 2.5, tags: JSON.stringify(['veg', 'gluten-free']) },
    { food_name: 'Aloo Gobi', regional_alias: 'आलू गोभी', category: 'sabzi', serving_unit: 'katori', serving_size: 1, calories: 145, protein: 3.5, carbs: 18, fats: 6.8, fiber: 3.2, tags: JSON.stringify(['veg', 'gluten-free', 'vegan']) },
    { food_name: 'Bhindi Masala', regional_alias: 'भिंडी मसाला', category: 'sabzi', serving_unit: 'katori', serving_size: 1, calories: 130, protein: 2.8, carbs: 12, fats: 8.2, fiber: 3.8, tags: JSON.stringify(['veg', 'gluten-free', 'vegan']) },
    { food_name: 'Paneer Butter Masala', regional_alias: 'पनीर बटर मसाला', category: 'sabzi', serving_unit: 'katori', serving_size: 1, calories: 310, protein: 14, carbs: 12, fats: 24, fiber: 1.5, tags: JSON.stringify(['veg', 'gluten-free']) },
    { food_name: 'Mixed Veg Curry', regional_alias: 'मिक्स वेज', category: 'sabzi', serving_unit: 'katori', serving_size: 1, calories: 135, protein: 3.5, carbs: 15, fats: 6.5, fiber: 3.5, tags: JSON.stringify(['veg', 'gluten-free']) },
    { food_name: 'Baingan Bharta', regional_alias: 'बैंगन भर्ता', category: 'sabzi', serving_unit: 'katori', serving_size: 1, calories: 120, protein: 2.5, carbs: 10, fats: 7.8, fiber: 3.2, tags: JSON.stringify(['veg', 'gluten-free', 'vegan']) },
    // Non-Veg
    { food_name: 'Chicken Curry', regional_alias: 'चिकन करी', category: 'meat', serving_unit: 'katori', serving_size: 1, calories: 245, protein: 22, carbs: 8, fats: 14, fiber: 1.2, tags: JSON.stringify(['non-veg', 'gluten-free']) },
    { food_name: 'Butter Chicken', regional_alias: 'बटर चिकन', category: 'meat', serving_unit: 'katori', serving_size: 1, calories: 340, protein: 24, carbs: 10, fats: 24, fiber: 1, tags: JSON.stringify(['non-veg', 'gluten-free']) },
    { food_name: 'Egg Bhurji', regional_alias: 'अंडा भुर्जी', category: 'meat', serving_unit: 'piece', serving_size: 2, calories: 190, protein: 14, carbs: 2.5, fats: 14, fiber: 0.5, tags: JSON.stringify(['non-veg', 'gluten-free']) },
    { food_name: 'Fish Curry', regional_alias: 'मछली करी', category: 'meat', serving_unit: 'katori', serving_size: 1, calories: 195, protein: 20, carbs: 6, fats: 10, fiber: 1, tags: JSON.stringify(['non-veg', 'gluten-free']) },
    { food_name: 'Tandoori Chicken', regional_alias: 'तंदूरी चिकन', category: 'meat', serving_unit: 'piece', serving_size: 1, calories: 220, protein: 28, carbs: 4, fats: 10, fiber: 0.5, tags: JSON.stringify(['non-veg', 'gluten-free']) },
    { food_name: 'Boiled Egg', regional_alias: 'उबला अंडा', category: 'meat', serving_unit: 'piece', serving_size: 1, calories: 78, protein: 6.3, carbs: 0.6, fats: 5.3, fiber: 0, tags: JSON.stringify(['non-veg', 'gluten-free']) },
    // Snacks
    { food_name: 'Samosa', regional_alias: 'समोसा', category: 'snack', serving_unit: 'piece', serving_size: 1, calories: 252, protein: 4.5, carbs: 28, fats: 13.5, fiber: 2, tags: JSON.stringify(['veg']) },
    { food_name: 'Vada Pav', regional_alias: 'वड़ा पाव', category: 'snack', serving_unit: 'piece', serving_size: 1, calories: 290, protein: 5.5, carbs: 38, fats: 12, fiber: 2, tags: JSON.stringify(['veg']) },
    { food_name: 'Pakora', regional_alias: 'पकोड़ा', category: 'snack', serving_unit: 'piece', serving_size: 4, calories: 180, protein: 4, carbs: 18, fats: 10, fiber: 1.5, tags: JSON.stringify(['veg']) },
    { food_name: 'Dhokla', regional_alias: 'ढोकला', category: 'snack', serving_unit: 'piece', serving_size: 2, calories: 130, protein: 5, carbs: 20, fats: 3, fiber: 1, tags: JSON.stringify(['veg']) },
    // Dairy & Drinks
    { food_name: 'Curd (Dahi)', regional_alias: 'दही', category: 'dairy', serving_unit: 'katori', serving_size: 1, calories: 98, protein: 4.3, carbs: 7.5, fats: 5.5, fiber: 0, tags: JSON.stringify(['veg', 'gluten-free']) },
    { food_name: 'Paneer (Raw)', regional_alias: 'पनीर', category: 'dairy', serving_unit: 'grams', serving_size: 100, calories: 265, protein: 18.3, carbs: 1.2, fats: 20.8, fiber: 0, tags: JSON.stringify(['veg', 'gluten-free']) },
    { food_name: 'Lassi (Sweet)', regional_alias: 'लस्सी', category: 'drink', serving_unit: 'glass', serving_size: 1, calories: 185, protein: 6, carbs: 28, fats: 5.5, fiber: 0, tags: JSON.stringify(['veg', 'gluten-free']) },
    { food_name: 'Buttermilk (Chaas)', regional_alias: 'छाछ', category: 'drink', serving_unit: 'glass', serving_size: 1, calories: 40, protein: 2.5, carbs: 4.5, fats: 1.2, fiber: 0, tags: JSON.stringify(['veg', 'gluten-free']) },
    { food_name: 'Masala Chai', regional_alias: 'चाय', category: 'drink', serving_unit: 'cup', serving_size: 1, calories: 72, protein: 1.8, carbs: 10, fats: 2.5, fiber: 0, tags: JSON.stringify(['veg', 'gluten-free']) },
    { food_name: 'Filter Coffee', regional_alias: 'कॉफ़ी', category: 'drink', serving_unit: 'cup', serving_size: 1, calories: 65, protein: 1.5, carbs: 8, fats: 2.8, fiber: 0, tags: JSON.stringify(['veg', 'gluten-free']) },
    // Fruits
    { food_name: 'Banana', regional_alias: 'केला', category: 'fruit', serving_unit: 'piece', serving_size: 1, calories: 105, protein: 1.3, carbs: 27, fats: 0.4, fiber: 3.1, tags: JSON.stringify(['veg', 'vegan', 'gluten-free']) },
    { food_name: 'Apple', regional_alias: 'सेब', category: 'fruit', serving_unit: 'piece', serving_size: 1, calories: 95, protein: 0.5, carbs: 25, fats: 0.3, fiber: 4.4, tags: JSON.stringify(['veg', 'vegan', 'gluten-free']) },
    { food_name: 'Mango', regional_alias: 'आम', category: 'fruit', serving_unit: 'piece', serving_size: 1, calories: 135, protein: 1.1, carbs: 35, fats: 0.6, fiber: 3.7, tags: JSON.stringify(['veg', 'vegan', 'gluten-free']) },
    // Supplements/Fitness
    { food_name: 'Whey Protein Shake', regional_alias: null, category: 'supplement', serving_unit: 'scoop', serving_size: 1, calories: 120, protein: 24, carbs: 3, fats: 1.5, fiber: 0, tags: JSON.stringify(['veg', 'gluten-free']) },
    { food_name: 'Peanut Butter', regional_alias: 'मूंगफली मक्खन', category: 'supplement', serving_unit: 'tablespoon', serving_size: 2, calories: 188, protein: 8, carbs: 6, fats: 16, fiber: 2, tags: JSON.stringify(['veg', 'vegan', 'gluten-free']) },
    { food_name: 'Oats (Cooked)', regional_alias: 'ओट्स', category: 'grain', serving_unit: 'katori', serving_size: 1, calories: 158, protein: 5.5, carbs: 27, fats: 3.2, fiber: 4, tags: JSON.stringify(['veg', 'vegan']) },
    // Sweets
    { food_name: 'Gulab Jamun', regional_alias: 'गुलाब जामुन', category: 'sweet', serving_unit: 'piece', serving_size: 1, calories: 175, protein: 2, carbs: 28, fats: 6.5, fiber: 0.2, tags: JSON.stringify(['veg']) },
    { food_name: 'Jalebi', regional_alias: 'जलेबी', category: 'sweet', serving_unit: 'piece', serving_size: 2, calories: 200, protein: 1.5, carbs: 38, fats: 5, fiber: 0, tags: JSON.stringify(['veg']) },
    { food_name: 'Rasgulla', regional_alias: 'रसगुल्ला', category: 'sweet', serving_unit: 'piece', serving_size: 1, calories: 125, protein: 3.5, carbs: 22, fats: 2.5, fiber: 0, tags: JSON.stringify(['veg', 'gluten-free']) },
    // Biryani & Rice Dishes
    { food_name: 'Chicken Biryani', regional_alias: 'चिकन बिरयानी', category: 'grain', serving_unit: 'plate', serving_size: 1, calories: 490, protein: 22, carbs: 58, fats: 18, fiber: 2, tags: JSON.stringify(['non-veg']) },
    { food_name: 'Veg Biryani', regional_alias: 'वेज बिरयानी', category: 'grain', serving_unit: 'plate', serving_size: 1, calories: 380, protein: 8, carbs: 55, fats: 14, fiber: 3, tags: JSON.stringify(['veg']) },
    { food_name: 'Khichdi', regional_alias: 'खिचड़ी', category: 'grain', serving_unit: 'katori', serving_size: 1, calories: 165, protein: 6, carbs: 28, fats: 3.5, fiber: 2.5, tags: JSON.stringify(['veg', 'gluten-free']) },
    // Raita/Sides
    { food_name: 'Raita', regional_alias: 'रायता', category: 'dairy', serving_unit: 'katori', serving_size: 1, calories: 68, protein: 3.2, carbs: 5.5, fats: 3.5, fiber: 0.5, tags: JSON.stringify(['veg', 'gluten-free']) },
    { food_name: 'Papad (Roasted)', regional_alias: 'पापड़', category: 'snack', serving_unit: 'piece', serving_size: 1, calories: 45, protein: 2.5, carbs: 7, fats: 0.8, fiber: 1, tags: JSON.stringify(['veg', 'gluten-free']) },
  ])
}
