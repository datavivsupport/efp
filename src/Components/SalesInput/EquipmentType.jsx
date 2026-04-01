import SearchableSelect from "../SearchableSelect/SearchableSelect";

const EquipmentTypeSelect = ({ placeholder = "Select Equipment Type", ...rest }) => (
  <SearchableSelect
    url="/accounts/master/EFPEquipment/"
    placeholder={placeholder}
    valueKey="name"
    {...rest}
  />
);

export default EquipmentTypeSelect;
