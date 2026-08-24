"""Fictional Bangalore seed data for ZOZOCIRCLE."""

IMG = {
    "pickle": "https://images.unsplash.com/photo-1617854307432-13950e24ba07?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    "pickle2": "https://images.pexels.com/photos/38857376/pexels-photo-38857376.jpeg?auto=compress&cs=tinysrgb&w=900",
    "pickle3": "https://images.pexels.com/photos/9005955/pexels-photo-9005955.jpeg?auto=compress&cs=tinysrgb&w=900",
    "honey": "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    "honey2": "https://images.unsplash.com/photo-1679941279735-b3b35e8bc476?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    "cake": "https://images.pexels.com/photos/9333544/pexels-photo-9333544.jpeg?auto=compress&cs=tinysrgb&w=900",
    "brownie": "https://images.pexels.com/photos/27850024/pexels-photo-27850024.jpeg?auto=compress&cs=tinysrgb&w=900",
    "oil": "https://images.unsplash.com/photo-1637523783035-bcda83e8bff7?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    "serum": "https://images.unsplash.com/photo-1573575154488-f88a60e170df?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    "soap": "https://images.pexels.com/photos/6621339/pexels-photo-6621339.jpeg?auto=compress&cs=tinysrgb&w=900",
    "soap2": "https://images.pexels.com/photos/10825671/pexels-photo-10825671.jpeg?auto=compress&cs=tinysrgb&w=900",
    "sewing": "https://images.pexels.com/photos/6461151/pexels-photo-6461151.jpeg?auto=compress&cs=tinysrgb&w=900",
    "sewing2": "https://images.unsplash.com/photo-1606501126768-b78d4569d3f9?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    "sewing3": "https://images.unsplash.com/photo-1466027397211-20d0f2449a3f?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    "plants": "https://images.unsplash.com/photo-1683994851774-6e9642fb8a95?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    "plants2": "https://images.unsplash.com/photo-1721978128124-5a7aef8fcb00?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    "physio": "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    "yoga": "https://images.pexels.com/photos/7055738/pexels-photo-7055738.jpeg?auto=compress&cs=tinysrgb&w=900",
    "yoga2": "https://images.unsplash.com/photo-1518459031867-a89b944bffe4?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    "salon": "https://images.unsplash.com/photo-1675034743339-0b0747047727?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    "fitness": "https://images.unsplash.com/photo-1571732154690-f6d1c3e5178a?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    "gym": "https://images.pexels.com/photos/35341600/pexels-photo-35341600.jpeg?auto=compress&cs=tinysrgb&w=900",
}

CATEGORIES = [
    {"slug": "food", "name": "Food", "icon": "UtensilsCrossed", "applies_to": "both"},
    {"slug": "beauty", "name": "Beauty", "icon": "Sparkles", "applies_to": "both"},
    {"slug": "home", "name": "Home", "icon": "Home", "applies_to": "both"},
    {"slug": "education", "name": "Education", "icon": "GraduationCap", "applies_to": "service"},
    {"slug": "fashion", "name": "Fashion", "icon": "Shirt", "applies_to": "both"},
    {"slug": "auto", "name": "Auto", "icon": "Car", "applies_to": "service"},
    {"slug": "handmade", "name": "Handmade", "icon": "Hand", "applies_to": "product"},
    {"slug": "repair", "name": "Repair", "icon": "Wrench", "applies_to": "service"},
    {"slug": "health", "name": "Health & Wellness", "icon": "HeartPulse", "applies_to": "service"},
    {"slug": "plants", "name": "Plants", "icon": "Leaf", "applies_to": "product"},
]

# (business_name, owner, locality, lat, lng, biz_type, primary_cat, verification, description, listings)
SELLERS = [
    ("Priya's Home Kitchen", "Priya Sharma", "Whitefield", 12.9698, 77.7500, "product", "food", "verified",
     "Small-batch homemade pickles, podis and traditional preserves made fresh at home.", [
         ("product", "Homemade Mango Pickle", "food", 180, "300g", "Traditional homemade mango pickle made in small batches with cold-pressed oil and authentic spices.", [IMG["pickle"], IMG["pickle2"]], 4.8, 24, "approved", ["100% Homemade", "No Preservatives", "Made in Small Batches"]),
         ("product", "Lemon Pickle", "food", 150, "250g", "Tangy lemon pickle made with country lemons and hand-ground masala.", [IMG["pickle3"]], 4.7, 16, "approved", ["No Preservatives"]),
     ]),
    ("Pure Forest Honey", "Anil Kumar", "Marathahalli", 12.9591, 77.6974, "product", "food", "verified",
     "Raw, unprocessed forest honey sourced from Karnataka's Western Ghats.", [
         ("product", "Raw Forest Honey", "food", 350, "500g", "Unheated, unfiltered raw forest honey collected from wild beehives.", [IMG["honey"], IMG["honey2"]], 4.9, 41, "approved", ["Raw & Unfiltered", "No Sugar Added"]),
     ]),
    ("Home Made Cakes", "Meera Nair", "Indiranagar", 12.9719, 77.6412, "product", "food", "verified",
     "Eggless and classic home-baked cakes, brownies and tea cakes baked to order.", [
         ("product", "Chocolate Brownie", "food", 250, "pack of 6", "Fudgy chocolate brownies baked fresh with Belgian cocoa.", [IMG["brownie"]], 4.7, 33, "approved", ["Baked Fresh", "Eggless Option"]),
         ("product", "Walnut Tea Cake", "food", 420, "500g", "Soft walnut tea cake, perfect with evening chai.", [IMG["cake"]], 4.6, 12, "approved", []),
     ]),
    ("Meera's Tailoring", "Meera Devi", "Koramangala", 12.9352, 77.6245, "service", "fashion", "verified",
     "Home tailoring for blouses, kurtas and alterations with doorstep pickup.", [
         ("service", "Home Tailoring", "fashion", 150, "onwards", "Stitching and alterations done at home with free doorstep pickup and delivery.", [IMG["sewing"], IMG["sewing2"]], 4.7, 58, "approved", ["Doorstep Pickup", "3 Day Delivery"]),
     ]),
    ("Rahul Physiotherapy", "Rahul Menon", "HSR Layout", 12.9116, 77.6389, "service", "health", "verified",
     "Certified physiotherapist offering home-visit sessions for pain and post-surgery recovery.", [
         ("service", "Home Physiotherapy", "health", 600, "per session", "Physiotherapy sessions at your home for back pain, knee pain and post-surgery rehab.", [IMG["physio"]], 4.9, 47, "approved", ["Home Visit", "Certified Therapist"]),
     ]),
    ("Bangalore Yoga Studio", "Kavya Rao", "Jayanagar", 12.9299, 77.5826, "service", "health", "verified",
     "Small-group and one-on-one yoga classes for all levels.", [
         ("service", "Yoga Classes", "health", 1200, "per month", "Morning and evening yoga batches, online and offline options available.", [IMG["yoga"], IMG["yoga2"]], 4.8, 62, "approved", ["Small Batches", "Online & Offline"]),
     ]),
    ("Natural Care", "Divya Prasad", "Bellandur", 12.9257, 77.6767, "product", "beauty", "verified",
     "Handmade natural hair oils and skincare made with cold-pressed ingredients.", [
         ("product", "Herbal Hair Oil", "beauty", 299, "200ml", "Natural and handmade herbal hair oil with hibiscus, curry leaf and coconut.", [IMG["oil"], IMG["serum"]], 4.8, 29, "approved", ["Handmade", "Chemical Free"]),
     ]),
    ("Handmade Soap Studio", "Sneha Iyer", "Banashankari", 12.9250, 77.5468, "product", "handmade", "approved",
     "Cold-process handmade soaps using essential oils and natural butters.", [
         ("product", "Homemade Soap", "handmade", 120, "per piece", "Cold-process handmade soap with shea butter and essential oils.", [IMG["soap"], IMG["soap2"]], 4.6, 21, "approved", ["Natural Ingredients", "Palm Oil Free"]),
     ]),
    ("Fresh Pickle Kitchen", "Lakshmi Bai", "Rajajinagar", 12.9916, 77.5522, "product", "food", "approved",
     "Andhra-style pickles and gunpowder podis made fresh every week.", [
         ("product", "Gongura Pickle", "food", 220, "300g", "Spicy Andhra-style gongura pickle made with fresh sorrel leaves.", [IMG["pickle2"]], 4.5, 9, "approved", ["Spicy", "Fresh Batch"]),
     ]),
    ("Homemade Snacks Co", "Ramya Gowda", "Basavanagudi", 12.9422, 77.5738, "product", "food", "approved",
     "Traditional Karnataka snacks - chakli, nippattu, kodubale and more.", [
         ("product", "Mixed Snack Box", "food", 260, "500g", "Assorted homemade chakli, nippattu and kodubale, freshly fried.", [IMG["brownie"]], 4.4, 14, "approved", ["Freshly Made"]),
     ]),
    ("Green Leaf Nursery", "Suresh Babu", "Yelahanka", 13.1007, 77.5963, "product", "plants", "approved",
     "Indoor and outdoor plants, planters and organic potting mix.", [
         ("product", "Indoor Plant Set", "plants", 499, "set of 3", "Set of three low-maintenance indoor plants with ceramic planters.", [IMG["plants"], IMG["plants2"]], 4.6, 18, "approved", ["Air Purifying", "Low Maintenance"]),
     ]),
    ("Home Salon by Anita", "Anita Joseph", "Whitefield", 12.9760, 77.7360, "service", "beauty", "verified",
     "Salon services at your doorstep - facials, waxing, hair care.", [
         ("service", "Home Salon Service", "beauty", 400, "onwards", "Professional salon services at your home with sanitised, single-use kits.", [IMG["salon"]], 4.7, 36, "approved", ["Doorstep Service", "Hygienic Kit"]),
     ]),
    ("Tailoring Classes Bengaluru", "Shanti Kumari", "Malleshwaram", 13.0035, 77.5709, "service", "education", "approved",
     "Beginner to advanced tailoring and pattern-making classes for women.", [
         ("service", "Tailoring Classes", "education", 2500, "per course", "6-week hands-on tailoring course covering basics to blouse stitching.", [IMG["sewing3"]], 4.6, 11, "approved", ["Small Groups", "Certificate"]),
     ]),
    ("Local Tutor Hub", "Vinay Shetty", "BTM Layout", 12.9166, 77.6101, "service", "education", "approved",
     "Home tuition for CBSE and State board students, classes 6 to 10.", [
         ("service", "Home Tuition", "education", 3000, "per month", "Maths and Science home tuition for classes 6-10, three sessions a week.", [IMG["yoga2"]], 4.5, 22, "approved", ["Home Visit"]),
     ]),
    ("FitStart Personal Training", "Arjun Reddy", "Hebbal", 13.0358, 77.5970, "service", "health", "approved",
     "Personal fitness training at home or nearby park.", [
         ("service", "Personal Fitness Training", "health", 800, "per session", "One-on-one fitness training with diet guidance, at home or park.", [IMG["fitness"], IMG["gym"]], 4.7, 19, "approved", ["Diet Plan Included"]),
     ]),
    ("QuickFix Appliance Repair", "Imran Shaikh", "Kammanahalli", 13.0159, 77.6410, "service", "repair", "approved",
     "Same-day repair for washing machines, fridges, microwaves and ACs.", [
         ("service", "Appliance Repair", "repair", 350, "visit charge", "Same-day home repair for washing machines, refrigerators and microwaves.", [IMG["sewing2"]], 4.4, 27, "approved", ["Same Day", "30 Day Warranty"]),
     ]),
    ("Anu's Handloom Corner", "Anuradha Hegde", "Vijayanagar", 12.9719, 77.5300, "product", "fashion", "approved",
     "Handloom cotton sarees, kurtas and stoles from Karnataka weavers.", [
         ("product", "Handloom Cotton Stole", "fashion", 650, "per piece", "Soft handloom cotton stole woven by Karnataka artisans.", [IMG["soap2"]], 4.5, 8, "approved", ["Handloom", "Natural Dye"]),
     ]),
    ("Chikkis & Sweets Home", "Geetha Murthy", "JP Nagar", 12.9063, 77.5857, "product", "food", "approved",
     "Homemade groundnut chikki, dry-fruit laddus and festival sweets.", [
         ("product", "Groundnut Chikki", "food", 140, "250g", "Crunchy groundnut chikki made with organic jaggery.", [IMG["cake"]], 4.6, 13, "approved", ["Jaggery Based"]),
     ]),
    ("Bright Home Cleaning", "Deepa Reddy", "Electronic City", 12.8452, 77.6602, "service", "home", "approved",
     "Deep cleaning for homes, kitchens and bathrooms.", [
         ("service", "Home Deep Cleaning", "home", 1500, "per 2BHK", "Full home deep cleaning with eco-friendly products and trained staff.", ["https://images.unsplash.com/photo-1686178827149-6d55c72d81df?q=80&w=2070&auto=format&fit=crop"], 4.5, 31, "approved", ["Eco Friendly"]),
     ]),
    ("Frames by Nikhil", "Nikhil Bhat", "Sadashivanagar", 13.0067, 77.5810, "service", "home", "pending",
     "Portrait, event and product photography around Bengaluru.", [
         ("service", "Photography Session", "home", 2500, "per session", "Two-hour portrait or product photography session with edited photos.", ["https://images.unsplash.com/photo-1549981832-2ba2ee913334?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"], 4.7, 6, "pending", ["Edited Photos"]),
     ]),
    ("Amma's Home Food", "Sarala Krishnan", "Domlur", 12.9609, 77.6387, "product", "food", "pending",
     "Daily home-cooked South Indian meals and tiffin boxes.", [
         ("product", "Daily Meal Box", "food", 120, "per meal", "Home-cooked South Indian meal box with rice, sambar, palya and curd.", [IMG["pickle3"]], 4.8, 4, "pending", ["Freshly Cooked", "Daily Delivery"]),
     ]),
    ("Wheels Care Bike Service", "Prakash Naik", "Bommanahalli", 12.9010, 77.6180, "service", "auto", "pending",
     "Doorstep two-wheeler servicing and minor repairs.", [
         ("service", "Doorstep Bike Service", "auto", 550, "per service", "General two-wheeler servicing at your doorstep including oil change.", [IMG["fitness"]], 4.3, 5, "pending", ["Doorstep Service"]),
     ]),
]
