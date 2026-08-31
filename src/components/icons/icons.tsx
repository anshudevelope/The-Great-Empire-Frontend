// Thin re-export layer over react-icons (Feather set, matching the app's clean
// line-icon look) so every consumer keeps importing semantic names from here
// instead of reaching into react-icons directly.
import type { IconType } from 'react-icons'
import {
  FiAlertTriangle,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiClock,
  FiEdit2,
  FiEye,
  FiEyeOff,
  FiGrid,
  FiLogOut,
  FiMenu,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUpload,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { HiOutlineBuildingOffice2 } from 'react-icons/hi2'

export const MenuIcon: IconType = FiMenu
export const XIcon: IconType = FiX
export const ChevronDownIcon: IconType = FiChevronDown
export const ChevronRightIcon: IconType = FiChevronRight
export const SearchIcon: IconType = FiSearch
export const LogoutIcon: IconType = FiLogOut
export const DashboardIcon: IconType = FiGrid
export const UsersIcon: IconType = FiUsers
export const PlusIcon: IconType = FiPlus
export const EyeIcon: IconType = FiEye
export const EyeOffIcon: IconType = FiEyeOff
export const PencilIcon: IconType = FiEdit2
export const TrashIcon: IconType = FiTrash2
export const ClockIcon: IconType = FiClock
export const CheckIcon: IconType = FiCheck
export const AlertTriangleIcon: IconType = FiAlertTriangle
export const UserCircleIcon: IconType = FiUser
export const UploadIcon: IconType = FiUpload
export const BuildingIcon: IconType = HiOutlineBuildingOffice2
