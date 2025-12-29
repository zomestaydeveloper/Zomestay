import React from 'react';
import { Star } from 'lucide-react';

const PropertyReviews = ({ reviews, avgRating }) => {
    const renderStars = (rating) => {
        return (
            <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                    <Star
                        key={i}
                        size={16}
                        className={`${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                            }`}
                    />
                ))}
            </div>
        );
    };

    return (
        <>
            <div className="flex justify-end gap-2 px-8">
                <h1 className="text-sm md:text-lg font-bold">Write Your Review</h1>
            </div>

            <div className="p-[20px] md:p-[40px]">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-bold">Reviews & Ratings</h2>
                    <div className="flex items-center gap-2">
                        {renderStars(Math.round(avgRating))}
                        <span className="text-sm font-medium text-gray-700">
                            {avgRating} / 5 ({reviews.length} reviews)
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    {reviews.map((r) => (
                        <div key={r.id} className="p-4 border border-gray-200 rounded-xl shadow-sm bg-white flex gap-4">
                            <img src={r.avatar} alt={r.name} className="w-12 h-12 rounded-full object-cover" />
                            <div>
                                <h3 className="font-semibold">{r.name}</h3>
                                {renderStars(r.rating)}
                                <p className="text-gray-600 mt-2">{r.review}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};

export default PropertyReviews;
