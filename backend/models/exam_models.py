from typing import List
from pydantic import BaseModel, Field

CHAPTER_MAP = {
    "Physics": [
        "Units and Measurement", "Kinematics", "Laws of Motion",
        "Work Energy Power", "Rotational Motion", "Gravitation",
        "Properties of Matter", "Thermal Properties", "Thermodynamics",
        "Kinetic Theory", "Oscillations", "Waves",
        "Electrostatics", "Current Electricity", "Moving Charges and Magnetism",
        "Magnetism and Matter", "Electromagnetic Induction", "Alternating Current",
        "EM Waves", "Ray Optics", "Wave Optics",
        "Dual Nature of Matter", "Atoms", "Nuclei", "Semiconductor Devices",
    ],
    "Chemistry": [
        "Basic Concepts of Chemistry", "Atomic Structure", "Chemical Bonding",
        "States of Matter", "Thermodynamics", "Equilibrium",
        "Redox Reactions", "Electrochemistry", "Chemical Kinetics",
        "Surface Chemistry", "Hydrogen and s-Block", "p-Block Elements",
        "d-Block and f-Block", "Coordination Compounds",
        "Organic Chemistry Basics", "Hydrocarbons", "Haloalkanes",
        "Alcohols Phenols Ethers", "Aldehydes and Ketones",
        "Carboxylic Acids", "Amines", "Biomolecules", "Polymers",
        "Chemistry in Everyday Life",
    ],
    "Mathematics": [
        "Sets Relations Functions", "Complex Numbers",
        "Matrices and Determinants", "Permutations Combinations",
        "Binomial Theorem", "Sequences and Series",
        "Straight Lines", "Circles", "Conic Sections",
        "3D Geometry", "Vectors", "Limits and Continuity",
        "Differentiation", "Applications of Derivatives",
        "Indefinite Integration", "Definite Integration",
        "Differential Equations", "Trigonometry",
        "Inverse Trigonometry", "Probability", "Statistics",
    ],
    "Biology": [
        "Diversity in Living World", "Structural Organisation",
        "Cell Structure and Function", "Plant Physiology",
        "Human Physiology", "Reproduction",
        "Genetics and Evolution", "Biology and Human Welfare",
        "Biotechnology", "Ecology and Environment",
    ],
}

# seconds per question
TIME_PER_QUESTION = {
    "JEE Main": 120,
    "JEE Advanced": 200,
    "NEET": 80,
    "Practice": 120,
}

# marks: correct / wrong penalty
MARKS_CONFIG = {
    "JEE Main":     {"correct": 4, "incorrect": -1},
    "JEE Advanced": {"correct": 4, "incorrect": -2},
    "NEET":         {"correct": 4, "incorrect": -1},
    "Practice":     {"correct": 4, "incorrect":  0},
}


class GenerateExamRequest(BaseModel):
    exam_mode: str = "JEE Main"
    subjects: List[str]
    chapters: List[str]
    num_questions: int = Field(default=20, ge=5, le=50)
    difficulty: str = "mixed"   # easy / medium / hard / mixed


class SubmitExamRequest(BaseModel):
    answers: dict   # {"0": "A", "3": "C", ...}
    time_taken: int  # seconds
