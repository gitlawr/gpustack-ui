import { useIntl } from '@umijs/max';
import { Badge, Tag, Tooltip } from 'antd';
import React from 'react';
import { RecipeFit, RecipeVerification } from '../../config/recipes';

const FitStatus: Record<RecipeFit, 'success' | 'warning' | 'default'> = {
  matched: 'success',
  compatible: 'warning',
  incompatible: 'default'
};

export const RecipeFitBadge: React.FC<{
  fit?: RecipeFit;
  showText?: boolean;
}> = ({ fit, showText = true }) => {
  const intl = useIntl();
  if (!fit) {
    return null;
  }
  return (
    <Tooltip
      title={intl.formatMessage({ id: `models.recipe.fit.${fit}.tips` })}
    >
      <Badge
        status={FitStatus[fit]}
        text={
          showText
            ? intl.formatMessage({ id: `models.recipe.fit.${fit}` })
            : undefined
        }
      />
    </Tooltip>
  );
};

const VerificationColor: Record<RecipeVerification, string> = {
  'gpustack-verified': 'green',
  'upstream-verified': 'blue',
  'upstream-supported': 'geekblue',
  'upstream-provided': 'default'
};

export const RecipeVerificationTag: React.FC<{
  verification: RecipeVerification;
}> = ({ verification }) => {
  const intl = useIntl();
  return (
    <Tag color={VerificationColor[verification]} style={{ marginInlineEnd: 0 }}>
      {intl.formatMessage({
        id: `models.recipe.verification.${verification}`
      })}
    </Tag>
  );
};
