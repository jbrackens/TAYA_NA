import { useState, useEffect } from 'react';

export const useResize = (myRef: any) => {
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);
  
    const handleResize = () => {
      setWidth(myRef.current.offsetWidth);
      setHeight(myRef.current.offsetHeight);
    }
  
    useEffect(() => {
      if (myRef.current) {
        handleResize();
        window.addEventListener('resize', handleResize);
      }
  
      return () => {
        myRef.current && window.removeEventListener('resize', handleResize);
      }
    }, [myRef]);
  
    return { width, height };
  };
