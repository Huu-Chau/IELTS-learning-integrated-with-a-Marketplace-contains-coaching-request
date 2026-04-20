import { useState } from 'react';
import { Star, Clock, BadgeCheck, BookOpen } from 'lucide-react';
import PaymentModal from '@/components/payment/PaymentModal';
import type { MarketplaceListing } from '@/pages/marketplace/TeacherList';

interface TeacherCardProps {
    listing: MarketplaceListing;
}

export default function TeacherCard({ listing }: TeacherCardProps) {
    console.log('[TeacherCard] render called', { listingId: listing.id });
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);

    const teacherName = listing.teacher?.name || 'Unknown Teacher';
    const avatar = listing.teacher?.avatar || `https://ui-avatars.com/api/?name=T&background=random`;

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col">
            <div className="p-6 flex-1">
                {/* Teacher profile header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center">
                        <img
                            src={avatar}
                            alt={teacherName}
                            className="h-14 w-14 rounded-full object-cover border-2 border-white shadow-sm"
                        />
                        <div className="ml-3">
                            <h3 className="text-base font-bold text-gray-900 flex items-center">
                                {teacherName}
                                <BadgeCheck className="h-4 w-4 text-blue-500 ml-1" />
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {listing.sessionDuration} min session
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-bold text-indigo-600">
                            {listing.pricePerHour.toLocaleString('vi-VN')} VND
                            <span className="text-xs text-gray-500 font-normal">/hr</span>
                        </p>
                    </div>
                </div>

                {/* Listing title */}
                <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
                        {listing.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{listing.description}</p>
                </div>

                {/* Star rating placeholder */}
                <div className="mt-3">
                    <div className="flex items-center space-x-1 text-sm text-amber-500 font-medium">
                        <Star className="h-4 w-4 fill-current" />
                        <span>New</span>
                    </div>
                </div>

                {/* Skill tags */}
                <div className="mt-3">
                    <div className="flex flex-wrap gap-1.5">
                        {listing.skills.map((skill) => (
                            <span
                                key={skill}
                                className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-md font-medium"
                            >
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer with action */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center text-xs text-gray-500">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>Available</span>
                </div>
                <button
                    onClick={() => setIsPaymentOpen(true)}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    Book Now
                </button>
            </div>

            <PaymentModal
                isOpen={isPaymentOpen}
                onClose={() => setIsPaymentOpen(false)}
                amount={listing.pricePerHour}
                description={`${listing.title} with ${teacherName}`}
                listingId={listing.id}
                teacherId={listing.teacherId}
            />
        </div>
    );
}
