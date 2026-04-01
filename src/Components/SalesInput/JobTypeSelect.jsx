import SearchableSelect from "../SearchableSelect/SearchableSelect";

const JobTypeSelect = ({ placeholder = "Select Job Type", ...rest }) => (
  <SearchableSelect
    url="/accounts/master/EFPJobType/"
    placeholder={placeholder}
    {...rest}
  />
);

export default JobTypeSelect;
