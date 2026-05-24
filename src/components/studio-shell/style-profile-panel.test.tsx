import { fireEvent, render, screen } from '@testing-library/react';

import { buildDefaultStyleProfile } from '@/lib/reference-material';

import { StyleProfilePanel } from './style-profile-panel';

describe('StyleProfilePanel', () => {
  it('updates style profile fields', () => {
    const onUpdateProfile = jest.fn();
    const profile = buildDefaultStyleProfile();

    render(<StyleProfilePanel profile={profile} onUpdateProfile={onUpdateProfile} />);

    fireEvent.change(screen.getByLabelText(/profile name/i), {
      target: { value: 'New profile' },
    });
    fireEvent.change(screen.getByLabelText(/voice principles/i), {
      target: { value: 'First line\nSecond line' },
    });

    expect(onUpdateProfile).toHaveBeenCalledWith({ name: 'New profile' });
    expect(onUpdateProfile).toHaveBeenCalledWith({
      voicePrinciples: ['First line', 'Second line'],
    });
  });

  it('locks profile editing while running', () => {
    const profile = buildDefaultStyleProfile();

    render(<StyleProfilePanel profile={profile} isRunning />);

    expect(screen.getByLabelText(/profile name/i)).toBeDisabled();
    expect(screen.getByLabelText(/voice principles/i)).toBeDisabled();
    expect(screen.getByLabelText(/avoid patterns/i)).toBeDisabled();
  });
});
