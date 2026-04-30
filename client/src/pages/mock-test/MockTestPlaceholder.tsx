import { ClipboardList, Timer, Lock } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';

interface MockTestPlaceholderProps {
    skill: 'Reading' | 'Listening' | 'Writing';
    duration: string;
}

export default function MockTestPlaceholder({ skill, duration }: MockTestPlaceholderProps) {
    return (
        <DashboardLayout role="student">
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6 text-center">
                <div className="w-20 h-20 rounded-2xl bg-violet-50 flex items-center justify-center">
                    <ClipboardList className="h-10 w-10 text-violet-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Mock Test — {skill}</h1>
                    <p className="text-gray-500 mt-2 max-w-md">
                        The full {skill} mock test module is under development. It will feature
                        timed conditions with a {duration} countdown, mirroring the real IELTS exam.
                    </p>
                </div>
                <div className="flex gap-4 flex-wrap justify-center">
                    <span className="flex items-center gap-1.5 bg-violet-50 text-violet-600 text-sm font-medium px-4 py-2 rounded-full">
                        <Timer className="h-4 w-4" />{duration} timed
                    </span>
                    <span className="flex items-center gap-1.5 bg-gray-100 text-gray-500 text-sm font-medium px-4 py-2 rounded-full">
                        <Lock className="h-4 w-4" />Coming soon
                    </span>
                </div>
            </div>
        </DashboardLayout>
    );
}
