import { useState } from 'react';
import { useTimer } from '@/contexts/TimerContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Settings, Save, RotateCcw } from 'lucide-react';

interface TimerSettingsProps {
  compact?: boolean;
  className?: string;
}

export default function TimerSettings({ 
  compact = false,
  className = ''
}: TimerSettingsProps) {
  const { settings, updateSettings, resetSettings } = useTimer();
  const [localSettings, setLocalSettings] = useState(settings);
  const [isDirty, setIsDirty] = useState(false);
  
  const handleChange = (key: keyof typeof settings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };
  
  const handleSave = () => {
    updateSettings(localSettings);
    setIsDirty(false);
  };
  
  const handleReset = () => {
    resetSettings();
    setLocalSettings(settings); // This will update after the context updates
    setIsDirty(false);
  };
  
  if (compact) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <Label htmlFor="work-duration" className="text-sm">Work</Label>
          <div className="flex items-center gap-2">
            <Input
              id="work-duration"
              type="number"
              min="1"
              max="60"
              value={localSettings.workDuration}
              onChange={(e) => handleChange('workDuration', parseInt(e.target.value) || 25)}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">min</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="break-duration" className="text-sm">Break</Label>
          <div className="flex items-center gap-2">
            <Input
              id="break-duration"
              type="number"
              min="1"
              max="30"
              value={localSettings.shortBreakDuration}
              onChange={(e) => handleChange('shortBreakDuration', parseInt(e.target.value) || 5)}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">min</span>
          </div>
        </div>
        
        {isDirty && (
          <Button onClick={handleSave} size="sm" className="w-full">
            <Save className="h-3 w-3 mr-2" />
            Save Changes
          </Button>
        )}
      </div>
    );
  }
  
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <h3 className="font-semibold">Timer Settings</h3>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="h-3 w-3 mr-2" />
          Reset
        </Button>
      </div>
      
      {/* Duration Settings */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="work-duration">Work Duration</Label>
          <div className="flex items-center gap-4 mt-2">
            <Slider
              id="work-duration"
              min={5}
              max={60}
              step={5}
              value={[localSettings.workDuration]}
              onValueChange={([value]) => handleChange('workDuration', value)}
              className="flex-1"
            />
            <div className="flex items-center gap-2 w-24">
              <Input
                type="number"
                min="5"
                max="60"
                value={localSettings.workDuration}
                onChange={(e) => handleChange('workDuration', parseInt(e.target.value) || 25)}
                className="w-16"
              />
              <span className="text-sm text-muted-foreground">min</span>
            </div>
          </div>
        </div>
        
        <div>
          <Label htmlFor="short-break-duration">Short Break Duration</Label>
          <div className="flex items-center gap-4 mt-2">
            <Slider
              id="short-break-duration"
              min={1}
              max={15}
              step={1}
              value={[localSettings.shortBreakDuration]}
              onValueChange={([value]) => handleChange('shortBreakDuration', value)}
              className="flex-1"
            />
            <div className="flex items-center gap-2 w-24">
              <Input
                type="number"
                min="1"
                max="15"
                value={localSettings.shortBreakDuration}
                onChange={(e) => handleChange('shortBreakDuration', parseInt(e.target.value) || 5)}
                className="w-16"
              />
              <span className="text-sm text-muted-foreground">min</span>
            </div>
          </div>
        </div>
        
        <div>
          <Label htmlFor="long-break-duration">Long Break Duration</Label>
          <div className="flex items-center gap-4 mt-2">
            <Slider
              id="long-break-duration"
              min={10}
              max={30}
              step={5}
              value={[localSettings.longBreakDuration]}
              onValueChange={([value]) => handleChange('longBreakDuration', value)}
              className="flex-1"
            />
            <div className="flex items-center gap-2 w-24">
              <Input
                type="number"
                min="10"
                max="30"
                value={localSettings.longBreakDuration}
                onChange={(e) => handleChange('longBreakDuration', parseInt(e.target.value) || 15)}
                className="w-16"
              />
              <span className="text-sm text-muted-foreground">min</span>
            </div>
          </div>
        </div>
        
        <div>
          <Label htmlFor="long-break-interval">Long Break Interval</Label>
          <div className="flex items-center gap-4 mt-2">
            <Slider
              id="long-break-interval"
              min={2}
              max={8}
              step={1}
              value={[localSettings.longBreakInterval]}
              onValueChange={([value]) => handleChange('longBreakInterval', value)}
              className="flex-1"
            />
            <div className="flex items-center gap-2 w-24">
              <Input
                type="number"
                min="2"
                max="8"
                value={localSettings.longBreakInterval}
                onChange={(e) => handleChange('longBreakInterval', parseInt(e.target.value) || 4)}
                className="w-16"
              />
              <span className="text-sm text-muted-foreground">sessions</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Take a long break after every {localSettings.longBreakInterval} work sessions
          </p>
        </div>
      </div>
      
      {/* Toggle Settings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="auto-start-breaks" className="cursor-pointer">Auto-start Breaks</Label>
            <p className="text-xs text-muted-foreground">Automatically start break after work session</p>
          </div>
          <Switch
            id="auto-start-breaks"
            checked={localSettings.autoStartBreaks}
            onCheckedChange={(checked) => handleChange('autoStartBreaks', checked)}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="auto-start-work" className="cursor-pointer">Auto-start Work</Label>
            <p className="text-xs text-muted-foreground">Automatically start work after break</p>
          </div>
          <Switch
            id="auto-start-work"
            checked={localSettings.autoStartWork}
            onCheckedChange={(checked) => handleChange('autoStartWork', checked)}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="sound-enabled" className="cursor-pointer">Sound Alerts</Label>
            <p className="text-xs text-muted-foreground">Play sound when session ends</p>
          </div>
          <Switch
            id="sound-enabled"
            checked={localSettings.soundEnabled}
            onCheckedChange={(checked) => handleChange('soundEnabled', checked)}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="notifications-enabled" className="cursor-pointer">Notifications</Label>
            <p className="text-xs text-muted-foreground">Show browser notifications</p>
          </div>
          <Switch
            id="notifications-enabled"
            checked={localSettings.notificationsEnabled}
            onCheckedChange={(checked) => handleChange('notificationsEnabled', checked)}
          />
        </div>
      </div>
      
      {/* Save Button */}
      {isDirty && (
        <Button onClick={handleSave} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      )}
    </div>
  );
}