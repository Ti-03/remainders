import StudentViewEnhanced from './student-view-enhanced';

interface StudentViewProps {
  width: number;
  height: number;
  studyStartDate: string;
  universityName: string;
  studyDurationYears: number;
}

export function StudentView(props: StudentViewProps) {
  return <StudentViewEnhanced {...props} />;
}
