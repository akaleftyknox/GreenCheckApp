// utils/gradeUtils.ts

export const getGradeInfo = (score: number) => {
    let grade = '';
    let ratingDescription = '';
    let badgeBackgroundColor = '#FFFFFF';
    let backgroundColor = '#FFFFFF';
  
    if (score <= 1) {
      badgeBackgroundColor = '#014737';
      backgroundColor = '#BCF0DA';
      grade = 'A+';
      ratingDescription = 'This product is as clean as it gets';
    } else if (score <= 2) {
      badgeBackgroundColor = '#014737';
      backgroundColor = '#BCF0DA';
      grade = 'A';
      ratingDescription = 'Very low toxicity, very safe';
    } else if (score <= 4) {
      badgeBackgroundColor = '#633112';
      backgroundColor = '#FCE96A';
      grade = 'B';
      ratingDescription = 'Low toxicity, safe for use';
    } else if (score <= 6) {
      badgeBackgroundColor = '#633112';
      backgroundColor = '#FCE96A';
      grade = 'C';
      ratingDescription = 'Moderate toxicity, use caution';
    } else if (score <= 8) {
      badgeBackgroundColor = '#771D1D';
      backgroundColor = '#FBD5D5';
      grade = 'D';
      ratingDescription = 'High toxicity, limit usage';
    } else {
      badgeBackgroundColor = '#771D1D';
      backgroundColor = '#FBD5D5';
      grade = 'F';
      ratingDescription = 'Very high toxicity, avoid use';
    }
  
    return { grade, ratingDescription, badgeBackgroundColor, backgroundColor };
  };
  
  export const getTextColor = (score: number) => {
    let color = '#000000';
    if (score <= 2) {
      color = '#014737';
    } else if (score <= 6) {
      color = '#633112';
    } else if (score <= 10) {
      color = '#771D1D';
    }
    return color;
  };
  
  export const getIngredientGradeInfo = (toxicityRating: number) => {
    let grade = '';
    let color = '#000000';
  
    if (toxicityRating <= 1) {
      color = '#014737';
      grade = 'A+';
    } else if (toxicityRating <= 2) {
      color = '#014737';
      grade = 'A';
    } else if (toxicityRating <= 4) {
      color = '#633112';
      grade = 'B';
    } else if (toxicityRating <= 6) {
      color = '#633112';
      grade = 'C';
    } else if (toxicityRating <= 8) {
      color = '#771D1D';
      grade = 'D';
    } else {
      color = '#771D1D';
      grade = 'F';
    }
  
    return { grade, color };
  };