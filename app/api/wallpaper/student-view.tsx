import StudentViewEnhanced from './student-view-enhanced';

interface StudentViewProps {
  width: number;
  height: number;
  studyStartDate: string;
  universityName: string;
  goalEndDate: string;
}

export function StudentView(props: StudentViewProps) {
  return <StudentViewEnhanced {...props} />;
}
