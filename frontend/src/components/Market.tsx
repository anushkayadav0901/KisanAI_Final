import { useState, useCallback, memo } from "react";
import { Star, ShoppingCart } from "lucide-react";

declare global {
    interface Window {
        Razorpay: any;
    }
}

interface Product {
    id: number;
    name: string;
    image: string;
    price: number;
    rentalPrice: number;
    description: string;
    category: string;
    rating: number;
    featured?: boolean;
    discount?: number;
}

const products: Product[] = [
    {
        id: 1,
        name: "Drip Irrigation Kit",
        image: "https://images.unsplash.com/photo-1591154669695-5f2a8d20c089?w=400&h=300&fit=crop",
        price: 5000,
        rentalPrice: 800,
        description: "Water-efficient drip irrigation for Indian climate",
        category: "Irrigation",
        rating: 4.7,
        featured: true,
    },
    {
        id: 2,
        name: "Premium Seeds",
        image: "https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?w=400&h=300&fit=crop",
        price: 4999,
        rentalPrice: 0,
        description: "Indigenous seed varieties for Indian farming",
        category: "Seeds",
        rating: 4.6,
        discount: 16,
    },
    {
        id: 3,
        name: "Sprayer Drone",
        image: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=400&h=300&fit=crop",
        price: 50000,
        rentalPrice: 2500,
        description: "Made in India drone for crop spraying",
        category: "Technology",
        rating: 4.9,
        featured: true,
    },
    {
        id: 4,
        name: "Soil Testing Kit",
        image: "https://images.unsplash.com/photo-1611735341450-74d61e660ad2?w=400&h=300&fit=crop",
        price: 8999,
        rentalPrice: 400,
        description: "Digital soil analysis with mobile app",
        category: "Tools",
        rating: 4.4,
        discount: 10,
    },
    {
        id: 5,
        name: "Polyhouse System",
        image: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400&h=300&fit=crop",
        price: 65000,
        rentalPrice: 1200,
        description: "Automated polyhouse for Indian weather",
        category: "Technology",
        rating: 4.7,
        featured: true,
    },
    {
        id: 6,
        name: "Vermicompost",
        image: "https://images.unsplash.com/photo-1515150144380-bca9f1650ed9?w=400&h=300&fit=crop",
        price: 3499,
        rentalPrice: 100,
        description: "Organic vermicompost for all crops",
        category: "Chemicals",
        rating: 4.5,
        discount: 27,
    }
];

const ProductCard = memo(({ product }: { product: Product }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handlePayment = useCallback(async () => {
        if (isLoading) return;
        setIsLoading(true);

        try {
            const API_BASE_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';
            const keyResponse = await fetch(`${API_BASE_URL}/payment/key`);
            if (!keyResponse.ok) throw new Error('Payment unavailable');
            const { key } = await keyResponse.json();

            const options = {
                key,
                amount: 100,
                currency: "INR",
                name: "Kisaan Saathi",
                description: `Payment for: ${product.name}`,
                handler: function () {
                    alert('Payment Successful!');
                },
                prefill: {
                    name: "Farmer",
                    email: "farmer@example.com",
                    contact: "9999999999"
                },
                theme: { color: "#63A361" }
            };

            new window.Razorpay(options).open();
        } catch {
            alert('Payment unavailable. Try again later.');
        } finally {
            setIsLoading(false);
        }
    }, [product.name, isLoading]);

    return (
        <div className="group bg-white rounded-2xl overflow-hidden border border-[#5B532C]/10 hover:shadow-xl hover:shadow-[#5B532C]/5 transition-all duration-300">
            {/* Image Container */}
            <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                {!imageLoaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
                <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    onLoad={() => setImageLoaded(true)}
                    className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                />
                {/* Overlay Badges */}
                <div className="absolute top-3 left-3 flex gap-2">
                    {product.featured && (
                        <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-[#63A361] text-white rounded-full">
                            Featured
                        </span>
                    )}
                    {product.discount && (
                        <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-[#FFC50F] text-[#5B532C] rounded-full">
                            {product.discount}% Off
                        </span>
                    )}
                </div>
                {/* Rating */}
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full">
                    <Star className="w-3 h-3 text-[#FFC50F] fill-[#FFC50F]" />
                    <span className="text-xs font-bold text-[#5B532C]">{product.rating}</span>
                </div>
            </div>

            {/* Content */}
            <div className="p-5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#63A361]">{product.category}</span>
                <h3 className="text-base font-bold text-[#5B532C] mt-1 mb-2">{product.name}</h3>
                <p className="text-sm text-[#5B532C]/50 mb-4 line-clamp-2">{product.description}</p>

                {/* Price Row */}
                <div className="flex items-end justify-between pt-4 border-t border-[#5B532C]/10">
                    <div>
                        <div className="text-2xl font-bold text-[#5B532C]">₹{product.price.toLocaleString()}</div>
                        {product.rentalPrice > 0 && (
                            <div className="text-xs text-[#63A361] mt-0.5">Rent at ₹{product.rentalPrice}/hr</div>
                        )}
                    </div>
                    <button
                        onClick={handlePayment}
                        disabled={isLoading}
                        className="flex items-center justify-center w-10 h-10 bg-[#63A361] text-white rounded-xl hover:bg-[#4a8a4d] disabled:opacity-50 transition-colors"
                    >
                        <ShoppingCart className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
});

ProductCard.displayName = 'ProductCard';

const Market = () => {
    return (
        <div className="px-4 py-24 mx-auto max-w-7xl sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
                <div>
                    <span className="text-xs font-semibold text-[#63A361] uppercase tracking-wider">Shop Now</span>
                    <h2 className="text-3xl sm:text-4xl font-bold text-[#5B532C] mt-2">
                        Farming <span className="text-[#63A361]">Marketplace</span>
                    </h2>
                </div>
                <p className="text-sm text-[#5B532C]/60 max-w-md">
                    Premium equipment trusted by thousands of farmers across India.
                </p>
            </div>

            {/* Products Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    );
};

export default Market;
