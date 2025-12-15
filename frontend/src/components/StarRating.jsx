/**
 * Composant de notation à étoiles
 */

import { useState } from 'react';
import './StarRating.css';

function StarRating({ value = 0, onChange, maxStars = 5, readonly = false }) {
  const [hoverValue, setHoverValue] = useState(0);

  const handleClick = (rating) => {
    if (!readonly && onChange) {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating) => {
    if (!readonly) {
      setHoverValue(rating);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverValue(0);
    }
  };

  const displayValue = hoverValue || value;

  return (
    <div className="star-rating">
      {[...Array(maxStars)].map((_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= displayValue;
        
        return (
          <span
            key={index}
            className={`star ${isFilled ? 'filled' : ''} ${readonly ? 'readonly' : 'clickable'}`}
            onClick={() => handleClick(starValue)}
            onMouseEnter={() => handleMouseEnter(starValue)}
            onMouseLeave={handleMouseLeave}
          >
            ★
          </span>
        );
      })}
      {!readonly && value > 0 && (
        <span className="rating-value">{value} / {maxStars}</span>
      )}
    </div>
  );
}

export default StarRating;


