// Available Services Data
const SERVICES = [
    {
        id: 'cleaning',
        name: 'Deep Cleaning',
        category: 'Cleaning',
        description: 'Professional deep cleaning service for your home',
        price: 899,
        duration: '2 hours',
        icon: 'fa-broom',
        color: 'indigo',
        features: [
            'Kitchen & bathroom deep clean',
            'Floor mopping & vacuuming',
            'Dusting & wiping surfaces',
            'Balcony cleaning'
        ]
    },
    {
        id: 'ac-repair',
        name: 'AC Repair & Service',
        category: 'Repair',
        description: 'Expert AC repair and maintenance service',
        price: 649,
        duration: '1 hour',
        icon: 'fa-wind',
        color: 'green',
        features: [
            'AC inspection & diagnosis',
            'Gas refilling',
            'Filter cleaning',
            '3-month warranty'
        ]
    },
    {
        id: 'plumbing',
        name: 'Plumbing Service',
        category: 'Repair',
        description: 'Quick plumbing fixes and installations',
        price: 499,
        duration: '45 mins',
        icon: 'fa-toilet',
        color: 'purple',
        features: [
            'Tap & pipe repair',
            'Leak fixing',
            'Bathroom fittings',
            'Emergency service'
        ]
    },
    {
        id: 'electrical',
        name: 'Electrical Work',
        category: 'Repair',
        description: 'Safe and certified electrical services',
        price: 549,
        duration: '1 hour',
        icon: 'fa-bolt',
        color: 'yellow',
        features: [
            'Wiring & rewiring',
            'Switch & socket repair',
            'Light installation',
            'Safety check'
        ]
    },
    {
        id: 'painting',
        name: 'Painting Service',
        category: 'Home Improvement',
        description: 'Professional painting for walls and furniture',
        price: 799,
        duration: '3 hours',
        icon: 'fa-paint-roller',
        color: 'pink',
        features: [
            'Wall painting',
            'Furniture painting',
            'Color consultation',
            'Premium quality paint'
        ]
    },
    {
        id: 'carpentry',
        name: 'Carpentry Service',
        category: 'Home Improvement',
        description: 'Expert carpentry and furniture repair',
        price: 699,
        duration: '2 hours',
        icon: 'fa-hammer',
        color: 'orange',
        features: [
            'Furniture repair',
            'Door & window fixing',
            'Custom woodwork',
            'Installation service'
        ]
    },
    {
        id: 'pest-control',
        name: 'Pest Control',
        category: 'Cleaning',
        description: 'Safe and effective pest control treatment',
        price: 999,
        duration: '1.5 hours',
        icon: 'fa-bug',
        color: 'red',
        features: [
            'Cockroach treatment',
            'Termite control',
            'Rodent control',
            '6-month guarantee'
        ]
    },
    {
        id: 'appliance-repair',
        name: 'Appliance Repair',
        category: 'Repair',
        description: 'Repair for all home appliances',
        price: 599,
        duration: '1 hour',
        icon: 'fa-blender',
        color: 'blue',
        features: [
            'Washing machine repair',
            'Refrigerator service',
            'Microwave repair',
            'All brands supported'
        ]
    }
];

// Get service by ID
function getServiceById(serviceId) {
    return SERVICES.find(s => s.id === serviceId);
}

// Get services by category
function getServicesByCategory(category) {
    return SERVICES.filter(s => s.category === category);
}

// Get all categories
function getAllCategories() {
    return [...new Set(SERVICES.map(s => s.category))];
}
