import React from 'react';
import SpeechItem from './speech-item';

interface SpeechContentProps {
  dataList: any[];
  loading?: boolean;
}

const SpeechContent: React.FC<SpeechContentProps> = (props) => {
  console.log('SpeechContent', props);
  return (
    <div>
      {props.dataList.map((item) => (
        <SpeechItem key={item.uid} {...item} />
      ))}
    </div>
  );
};

export default React.memo(SpeechContent);
