/**
 * Presentation metadata for the 101 columns of `robot_specs_cleaning`.
 *
 * Labels, units and grouping live here rather than in the database because none
 * of them are stored: the source spreadsheet carried units in a header row that
 * was never persisted, and grouping is purely a reading aid. The API returns raw
 * column keys and values; this file decides how they read.
 *
 * `key` must match the database column name exactly — the payload is built from
 * `to_jsonb(row)`, so the keys are the column names verbatim.
 *
 * Field order within a group follows the datasheet, so the matrix reads like the
 * source document rather than like an alphabetised dump.
 */

export type SpecKind = 'number' | 'text' | 'bool';

export interface SpecField {
  key: string;
  label: string;
  unit?: string;
  kind: SpecKind;
}

export interface SpecGroup {
  name: string;
  fields: SpecField[];
}

const n = (key: string, label: string, unit?: string): SpecField => ({ key, label, unit, kind: 'number' });
const t = (key: string, label: string): SpecField => ({ key, label, kind: 'text' });
const b = (key: string, label: string): SpecField => ({ key, label, kind: 'bool' });

export const SPEC_GROUPS: SpecGroup[] = [
  {
    name: 'Physical',
    fields: [
      n('dimension_l_mm', 'Length', 'mm'),
      n('dimension_w_mm', 'Width', 'mm'),
      n('dimension_h_mm', 'Height', 'mm'),
      n('robot_weight_kg', 'Weight', 'kg'),
    ],
  },
  {
    name: 'Cleaning width',
    fields: [
      n('sweep_width_mm', 'Sweep width', 'mm'),
      n('scrub_width_mm', 'Scrub width', 'mm'),
      n('mop_width_mm', 'Mop width', 'mm'),
    ],
  },
  {
    name: 'Brush & vacuum',
    fields: [
      n('brush_pressure_kg', 'Brush pressure', 'kg'),
      n('roller_speed_rpm', 'Roller speed', 'RPM'),
      n('brush_speed_rpm', 'Brush speed', 'RPM'),
      n('vacuum_pressure_kpa', 'Vacuum pressure', 'kPa'),
      n('vibration_more_than', 'Vibration more than'),
      n('noise_level_db', 'Noise level', 'dB'),
    ],
  },
  {
    name: 'Speed',
    fields: [
      n('max_travelling_speed_ms', 'Max travelling speed', 'm/s'),
      n('max_operation_speed_ms', 'Max operation speed', 'm/s'),
    ],
  },
  {
    name: 'Efficiency',
    fields: [
      n('sweep_efficiency_sqm_h', 'Sweep', 'm²/h'),
      n('scrub_efficiency_sqm_h', 'Scrub', 'm²/h'),
      n('mop_efficiency_sqm_h', 'Mop', 'm²/h'),
      n('sweep_scrub_efficiency_sqm_h', 'Sweep & scrub', 'm²/h'),
      n('vacuum_efficiency_sqm_h', 'Vacuum', 'm²/h'),
    ],
  },
  {
    name: 'Capacity',
    fields: [
      n('cleaning_capacity_l', 'Clean water', 'L'),
      n('waste_capacity_l', 'Waste water', 'L'),
      n('trash_capacity_l', 'Trash', 'L'),
      n('dust_bag_capacity_l', 'Dust bag', 'L'),
      b('dust_bag_charging_dock', 'Dust bag charging dock'),
      b('auto_clean', 'Auto clean'),
    ],
  },
  {
    name: 'Power',
    fields: [
      n('max_output_power_w', 'Max output power', 'W'),
      n('drive_motor_power_w', 'Drive motor power', 'W'),
    ],
  },
  {
    name: 'Battery',
    fields: [
      t('battery_type', 'Battery type'),
      n('battery_voltage_v', 'Voltage', 'V'),
      n('battery_capacity_ah', 'Capacity', 'Ah'),
      n('battery_charging_time_hr', 'Charging time', 'hr'),
      n('sweep_work_time_hr', 'Sweep work time', 'hr'),
      n('scrub_work_time_hr', 'Scrub work time', 'hr'),
      n('mop_work_time_hr', 'Mop work time', 'hr'),
    ],
  },
  {
    name: 'Access & obstacles',
    fields: [
      n('min_pass_width_mm', 'Min. pass width', 'mm'),
      n('min_pass_height_mm', 'Min. pass height', 'mm'),
      n('max_vertical_obstacle_height_mm', 'Max. vertical obstacle', 'mm'),
      n('max_trench_clearance_mm', 'Max. trench clearance', 'mm'),
      n('max_narrow_mm', 'Max. narrow', 'mm'),
      n('min_u_turn_width_mm', 'Min. U-turn width', 'mm'),
      n('min_edge_from_wall_mm', 'Min. edge from wall', 'mm'),
      n('max_step_height_mm', 'Max. step height', 'mm'),
      n('slope_angle_auto_deg', 'Slope angle (auto)', '°'),
      n('sensor_distance_m', 'Sensor distance', 'm'),
      n('sensor_degree_deg', 'Sensor degree', '°'),
    ],
  },
  {
    name: 'Environment',
    fields: [
      t('ip_rating', 'IP rating'),
      t('hepa', 'HEPA'),
      n('min_operating_temp_c', 'Min. operating temp', '°C'),
      n('max_operating_temp_c', 'Max. operating temp', '°C'),
      n('min_operating_humidity_pct', 'Min. operating humidity', '%'),
      n('max_operating_humidity_pct', 'Max. operating humidity', '%'),
      b('application', 'Application'),
      b('outdoor', 'Outdoor'),
      b('indoor', 'Indoor'),
    ],
  },
  {
    name: 'Cleaning functions',
    fields: [
      b('fn_sweep_no_vacuum', 'Sweep (no vacuum)'),
      b('fn_sweep_vacuum', 'Sweep + vacuum'),
      b('fn_mop_dry', 'Mop dry'),
      b('fn_mop_wet', 'Mop wet'),
      b('fn_scrub_brush_roller', 'Scrub — roller brush'),
      b('fn_scrub_brush_disc', 'Scrub — disc brush'),
    ],
  },
  {
    name: 'Sensors & navigation',
    fields: [
      b('nav_2d_lidar', '2D LiDAR'),
      b('nav_3d_lidar', '3D LiDAR'),
      b('nav_vslam', 'VSLAM'),
      b('sensor_rgb', 'RGB'),
      b('sensor_rgbd', 'RGBD'),
      b('sensor_ultrasonic', 'Ultrasonic'),
      b('anti_collision', 'Anti-collision'),
      b('anti_drop', 'Anti-drop'),
      b('spot_ai', 'Spot AI'),
    ],
  },
  {
    name: 'Features',
    fields: [
      b('manual_drive', 'Manual drive'),
      b('multi_robot_connect', 'Multi-robot connect'),
      b('auto_task_switch', 'Auto task switch'),
      b('iot_integration', 'IoT integration'),
      b('work_station', 'Work station'),
      b('dock_charge', 'Dock charge'),
      b('manual_charge', 'Manual charge'),
    ],
  },
  {
    name: 'Floor suitability',
    fields: [
      b('floor_layout_method', 'Floor layout method'),
      b('floor_rough_surface', 'Rough surface'),
      b('floor_smooth_surface', 'Smooth surface'),
      b('floor_real_wood', 'Real wood'),
      b('floor_paving_blocks', 'Paving blocks'),
      b('floor_granite_tiles', 'Granite tiles'),
      b('floor_ceramic_tiles', 'Ceramic tiles'),
      b('floor_marble', 'Marble'),
      b('floor_terrazzo', 'Terrazzo'),
      b('floor_nature_stone', 'Nature stone'),
      b('floor_terracotta', 'Terracotta'),
      b('floor_smooth_concrete', 'Smooth concrete'),
      b('floor_coarse_concrete', 'Coarse concrete'),
      b('floor_stamped_concrete', 'Stamped concrete'),
      b('floor_epoxy', 'Epoxy'),
      b('floor_pu', 'PU'),
      b('floor_asphalt', 'Asphalt'),
      b('floor_short_carpet', 'Short carpet'),
      b('floor_long_carpet', 'Long carpet'),
      b('floor_spc', 'SPC'),
      b('floor_wpc', 'WPC'),
      b('floor_laminate', 'Laminate'),
      b('floor_vinyl_pvc', 'Vinyl / PVC'),
      b('floor_washed_sand', 'Washed sand'),
    ],
  },
];

/** Every field, flattened — used for the "hide empty rows" pass. */
export const ALL_SPEC_FIELDS: SpecField[] = SPEC_GROUPS.flatMap((g) => g.fields);
