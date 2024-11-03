// types/database.ts

export interface Profile {
    id: string;
    username: string | null;
    is_public: boolean;
    followable: boolean;
    updated_at: string;
  }
  
  export interface Scan {
    id: string;
    user_id: string;
    created_at: string;
    overall_grade: number;
    overall_grade_description: string | null;
    image_url: string;
    scan_title: string | null;
    is_public: boolean;
  }
  
  export interface ScanIngredient {
    id: string;
    scan_id: string;
    ingredient_title: string;
    toxicity_rating: number;
    description: string | null;
    created_at: string;
  }