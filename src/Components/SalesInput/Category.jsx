import SearchableSelect from "../SearchableSelect/SearchableSelect";

const CategorySelect = ({ placeholder = "Select Category", ...rest }) => (
  <SearchableSelect
    url="/accounts/master/EFPCategory/"
    placeholder={placeholder}
    valueKey="name"
    {...rest}
  />
);

export default CategorySelect;
