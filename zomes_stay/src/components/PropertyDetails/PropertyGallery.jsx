import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Camera, X } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { mediaService } from '../../services';

const PropertyGallery = ({ media }) => {
    const [modal, setModal] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [mobileImageIndex, setMobileImageIndex] = useState(0);

    // Touch handling for swipe
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const minSwipeDistance = 50;

    const mainImage = media[0];
    const sideImages = media.slice(1, 5);
    const remaining = Math.max(0, media.length - 5);

    const goPrev = () => {
        setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
    };

    const goNext = () => {
        setCurrentIndex((prev) => (prev + 1) % media.length);
    };

    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            setMobileImageIndex((prev) => (prev + 1) % (media.length || 1));
        } else if (isRightSwipe) {
            setMobileImageIndex((prev) => (prev - 1 + (media.length || 1)) % (media.length || 1));
        }
    };

    // Keyboard navigation for modal
    useEffect(() => {
        if (!modal) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setModal(false);
            } else if (e.key === 'ArrowLeft' && media.length > 1) {
                goPrev();
            } else if (e.key === 'ArrowRight' && media.length > 1) {
                goNext();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [modal, media.length]);

    return (
        <>
            {/* Desktop View */}
            <div className="hidden md:flex md:flex-row px-4 py-4 md:px-10 pb-4 gap-2">
                {/* Left: main image */}
                <div className="w-full md:w-1/2 h-[260px] md:h-[500px]">
                    {mainImage ? (
                        <img
                            src={mediaService.getMedia(mainImage)}
                            alt="Main"
                            className="w-full h-full object-cover rounded-lg"
                        />
                    ) : (
                        <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                            No image available
                        </div>
                    )}
                </div>

                {/* Right: 2x2 grid */}
                <div className="w-full md:w-1/2 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {sideImages.map((img, i) => (
                        <div key={i} className="relative w-full h-[180px] md:h-[245px]">
                            <img
                                src={mediaService.getMedia(img)}
                                alt={`Property ${i + 2}`}
                                className="w-full h-full object-cover rounded-lg"
                            />

                            {i === sideImages.length - 1 && remaining > 0 && (
                                <button
                                    onClick={() => setModal(true)}
                                    className="absolute inset-0 rounded-lg bg-black/50 flex items-center justify-center cursor-pointer"
                                    aria-label="Open photo gallery"
                                >
                                    <span className="text-white text-lg font-semibold">+{remaining} Photos</span>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Mobile View - Carousel */}
            <div className="md:hidden px-4 py-2 ">
                {media.length > 0 ? (
                    <div className="relative w-full h-[300px] rounded-lg overflow-hidden">
                        {/* Main carousel image */}
                        <img
                            src={mediaService.getMedia(media[mobileImageIndex])}
                            alt={`Property ${mobileImageIndex + 1}`}
                            className="w-full h-full object-cover"
                            onTouchStart={onTouchStart}
                            onTouchMove={onTouchMove}
                            onTouchEnd={onTouchEnd}
                        />

                        {/* Navigation arrows */}
                        {media.length > 1 && (
                            <>
                                <button
                                    onClick={() => setMobileImageIndex((prev) => (prev - 1 + media.length) % media.length)}
                                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                                    aria-label="Previous image"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <button
                                    onClick={() => setMobileImageIndex((prev) => (prev + 1) % media.length)}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                                    aria-label="Next image"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </>
                        )}

                        {/* Image counter */}
                        <div className="absolute top-3 right-3 bg-black/50 text-white px-2 py-1 rounded-full text-sm">
                            {mobileImageIndex + 1} / {media.length}
                        </div>

                        {/* View all photos button - Camera icon */}
                        {media.length > 1 && (
                            <button
                                onClick={() => setModal(true)}
                                className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-gray-800 p-2.5 rounded-full shadow-lg hover:bg-white transition-all hover:scale-105"
                                aria-label="View all photos"
                            >
                                <Camera size={20} />
                            </button>
                        )}

                        {/* Dots indicator */}
                        {media.length > 1 && media.length <= 10 && (
                            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-2">
                                {media.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setMobileImageIndex(index)}
                                        className={`w-2 h-2 rounded-full transition-colors ${index === mobileImageIndex ? "bg-white" : "bg-white/50"}`}
                                        aria-label={`Go to image ${index + 1}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-full h-[300px] rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                        No images available
                    </div>
                )}

                {/* Mobile thumbnail strip */}
                {media.length > 1 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                        {media.slice(0, 8).map((img, index) => (
                            <button
                                key={index}
                                onClick={() => setMobileImageIndex(index)}
                                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${index === mobileImageIndex ? "border-blue-500" : "border-gray-200"
                                    }`}
                            >
                                <img
                                    src={mediaService.getMedia(img)}
                                    alt={`Thumbnail ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />
                            </button>
                        ))}
                        {media.length > 8 && (
                            <button
                                onClick={() => setModal(true)}
                                className="flex-shrink-0 w-16 h-16 rounded-lg bg-gray-100 border-2 border-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium"
                            >
                                +{media.length - 8}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Photo Gallery Modal */}
            {modal && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center"
                    onClick={() => setModal(false)}
                >
                    <div
                        className="relative w-full h-full flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-full p-2 transition-all hover:scale-110"
                            onClick={() => setModal(false)}
                            aria-label="Close gallery"
                        >
                            <X size={24} />
                        </button>

                        {/* Image Counter */}
                        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium">
                            {currentIndex + 1} / {media.length}
                        </div>

                        {/* Main Image Container */}
                        <div className="flex-1 flex items-center justify-center p-4 md:p-8">
                            <div className="relative w-full h-full max-w-7xl mx-auto flex items-center justify-center">
                                {/* Previous Button */}
                                {media.length > 1 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            goPrev();
                                        }}
                                        className="absolute left-2 md:left-4 z-40 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-full p-3 md:p-4 transition-all hover:scale-110"
                                        aria-label="Previous image"
                                    >
                                        <ChevronLeft size={28} />
                                    </button>
                                )}

                                {/* Image with Zoom */}
                                <div className="w-full h-full flex items-center justify-center">
                                    <TransformWrapper
                                        initialScale={1}
                                        minScale={0.5}
                                        maxScale={3}
                                        wheel={{ step: 0.1 }}
                                        doubleClick={{ disabled: false, step: 0.5 }}
                                    >
                                        <TransformComponent>
                                            {media[currentIndex] ? (
                                                <img
                                                    src={mediaService.getMedia(media[currentIndex])}
                                                    alt={`Gallery ${currentIndex + 1}`}
                                                    className="max-w-full max-h-[85vh] object-contain rounded-lg"
                                                />
                                            ) : (
                                                <div className="w-full h-[500px] rounded-lg bg-gray-800 flex items-center justify-center text-gray-400">
                                                    No image
                                                </div>
                                            )}
                                        </TransformComponent>
                                    </TransformWrapper>
                                </div>

                                {/* Next Button */}
                                {media.length > 1 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            goNext();
                                        }}
                                        className="absolute right-2 md:right-4 z-40 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-full p-3 md:p-4 transition-all hover:scale-110"
                                        aria-label="Next image"
                                    >
                                        <ChevronRight size={28} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Thumbnail Strip */}
                        {media.length > 1 && (
                            <div className="bg-black/50 backdrop-blur-sm border-t border-white/10 p-4">
                                <style>{`
                  .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                  }
                  .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>
                                <div className="flex gap-2 overflow-x-auto max-w-7xl mx-auto scrollbar-hide">
                                    {media.map((img, index) => (
                                        <button
                                            key={index}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setCurrentIndex(index);
                                            }}
                                            className={`flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden border-2 transition-all ${index === currentIndex
                                                    ? "border-white scale-110"
                                                    : "border-white/30 hover:border-white/60 opacity-70 hover:opacity-100"
                                                }`}
                                        >
                                            <img
                                                src={mediaService.getMedia(img)}
                                                alt={`Thumbnail ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default PropertyGallery;
